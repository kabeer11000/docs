import { HocuspocusProvider, WebSocketStatus } from "@hocuspocus/provider";
import * as Y from "yjs";
import { authManager } from "@/lib/auth/manager";
import { insertSettled } from "@/lib/pending-inserts";

// Live rooms (Hocuspocus) shared by the document editor and slides. A room can be opened ahead of
// time ("warmed", see lib/warm.ts) when the user shows intent to open a file; the editor then
// adopts that connection instead of connecting after it mounts. The join/fallback rules (5s to
// answer, 10s rejoin window) stay with the editors.

export const COLLAB_URL = process.env.NEXT_PUBLIC_HOCUSPOCUS_URL;
const WARM_TTL = 15000;

export async function collabToken() {
  const { tokens } = authManager.currentState;
  if (tokens && authManager.isTokenExpired(tokens.accessToken)) await authManager.refreshToken();
  return authManager.currentState.tokens?.accessToken ?? "";
}

interface Warm {
  doc: Y.Doc;
  provider: HocuspocusProvider;
  /** An editor is built on `doc` (it outlives the warm connection). */
  claimed: boolean;
  timer: ReturnType<typeof setTimeout>;
  discard: () => void;
}

const warm = new Map<string, Warm>();

// The room server checks the file exists, so a file created a moment ago waits for its insert.
const open = (id: string, doc: Y.Doc) =>
  new HocuspocusProvider({
    url: COLLAB_URL as string,
    name: id,
    document: doc,
    token: async () => {
      await insertSettled(id);
      return collabToken();
    },
  });

function release(id: string, w: Warm) {
  if (warm.get(id) === w) warm.delete(id);
  clearTimeout(w.timer);
  w.provider.off("disconnect", w.discard);
  w.provider.off("authenticationFailed", w.discard);
}

/** Opens (or keeps open) the live room for a file; closed again if nothing adopts it within 15s. */
export function warmRoom(id: string) {
  if (!COLLAB_URL || !authManager.currentState.tokens?.accessToken) return;
  const existing = warm.get(id);
  if (existing) {
    clearTimeout(existing.timer);
    existing.timer = setTimeout(existing.discard, WARM_TTL);
    return;
  }
  const doc = new Y.Doc();
  let provider: HocuspocusProvider;
  try {
    provider = open(id, doc);
  } catch {
    doc.destroy();
    return;
  }
  const w: Warm = {
    doc,
    provider,
    claimed: false,
    timer: setTimeout(() => w.discard(), WARM_TTL),
    // Only a connection that never dropped is adopted: after a drop the room may have been
    // reseeded, and merging this copy into it would duplicate text (see editor.tsx).
    discard: () => {
      release(id, w);
      provider.destroy();
      if (!w.claimed) doc.destroy();
    },
  };
  provider.on("disconnect", w.discard);
  provider.on("authenticationFailed", w.discard);
  warm.set(id, w);
}

/** The Y.Doc to build a file's editor on: the warmed room's (already syncing) when there is one. */
export function roomDoc(id: string): Y.Doc {
  const w = warm.get(id);
  if (!w) return new Y.Doc();
  w.claimed = true;
  return w.doc;
}

/** Joins the live room for `doc`, adopting the warmed connection when it was opened for this doc. */
export function joinRoom(id: string, doc: Y.Doc): HocuspocusProvider {
  const w = warm.get(id);
  if (w) {
    release(id, w);
    if (w.doc === doc) return w.provider;
    w.provider.destroy();
    if (!w.claimed) w.doc.destroy();
  }
  return open(id, doc);
}

/** Wires an editor to a room it may have adopted mid-handshake: handlers for states already reached run now. */
export function onRoom(
  hp: HocuspocusProvider,
  on: { connect: () => void; synced: () => void; authenticationFailed: () => void; disconnect: () => void },
) {
  hp.on("connect", on.connect);
  hp.on("synced", on.synced);
  hp.on("authenticationFailed", on.authenticationFailed);
  hp.on("disconnect", on.disconnect);
  if (hp.configuration.websocketProvider.status === WebSocketStatus.Connected) on.connect();
  if (hp.isSynced) on.synced();
  return () => {
    hp.off("connect", on.connect);
    hp.off("synced", on.synced);
    hp.off("authenticationFailed", on.authenticationFailed);
    hp.off("disconnect", on.disconnect);
  };
}
