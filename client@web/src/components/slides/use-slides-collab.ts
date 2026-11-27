import type { HocuspocusProvider } from "@hocuspocus/provider";
import { useEffect, useState } from "react";
import type * as Y from "yjs";
import { COLLAB_URL, joinRoom, onRoom } from "@/lib/collab-room";
import { showToast } from "@/lib/toast";

// Same rules as the document editor (editor.tsx): editors join the live room, wait for its copy, and
// fall back to editing alone if the server does not answer in time; viewers never join. A room
// warmed from Home (lib/warm.ts) is adopted, so the copy may already be here.
const CONNECT_TIMEOUT = 5000;
const REJOIN_WINDOW = 10000;

export type CollabState = "pending" | "connecting" | "live" | "solo";
/** `canEdit` is null until permissions are known. */
export function useSlidesCollab(
  documentId: string,
  doc: Y.Doc,
  canEdit: boolean | null,
) {
  const [state, setState] = useState<CollabState>("pending");

  useEffect(() => {
    if (canEdit === null) return;
    if (!canEdit || !COLLAB_URL) {
      setState("solo");
      return;
    }
    setState("connecting");
    let alive = true;
    let synced = false;
    let dropTimer: ReturnType<typeof setTimeout> | undefined;
    let hp: HocuspocusProvider | null = null;
    const goSolo = () => {
      hp?.destroy();
      hp = null;
      setState("solo");
    };
    const connectTimer = setTimeout(
      () => alive && !synced && goSolo(),
      CONNECT_TIMEOUT,
    );
    let unwire = () => {};
    try {
      hp = joinRoom(documentId, doc);
      unwire = onRoom(hp, {
        connect: () => clearTimeout(dropTimer),
        synced: () => {
          if (!alive || synced) return;
          synced = true;
          setState((s) => (s === "connecting" ? "live" : s));
        },
        authenticationFailed: () => alive && goSolo(),
        disconnect: () => {
          if (!alive || !hp) return;
          // ponytail: same as the doc editor; after a long drop the room may have been reseeded, so
          // stop rejoining (merging would duplicate content) and keep saving alone.
          clearTimeout(dropTimer);
          dropTimer = setTimeout(() => {
            if (!alive || !hp) return;
            goSolo();
            showToast.error(
              "Live editing disconnected",
              "Your changes still save. Reload to see others' edits.",
            );
          }, REJOIN_WINDOW);
        },
      });
    } catch {
      goSolo();
    }
    return () => {
      alive = false;
      unwire();
      clearTimeout(connectTimer);
      clearTimeout(dropTimer);
      hp?.destroy();
    };
  }, [documentId, doc, canEdit]);

  return state;
}
