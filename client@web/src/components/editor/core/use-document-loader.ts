import { useStore } from "@nanostores/react";
import type { Document } from "@shared-types";
import { atom, onMount, type WritableAtom } from "nanostores";
import { useMemo } from "react";
import { watchQuery } from "@/lib/cloudstore";
import { $auth } from "@/state/auth";
import { $documents, $documentsLive } from "@/state/cloudstore-data";
import { sameEmail } from "@/lib/email";

interface DocState {
  document: Document | null;
  isLoading: boolean;
  notFound: boolean;
}

// One live store and one watch per document id, shared by the header, the editor and anything else
// showing the document. Seeded from the Home documents list so a document opened from Home renders
// at once, but only from live rows: rows restored from IndexedDB may be stale and must never seed an
// editor (it would autosave them over newer content).
const stores = new Map<string, WritableAtom<DocState>>();
const listed = (id: string) => ($documentsLive.get() ? $documents.get().find((d) => d.id === id) : undefined);

function documentStore(id: string, primed?: Document): WritableAtom<DocState> {
  let store = stores.get(id);
  if (store) return store;
  const seed = primed ?? listed(id) ?? null;
  store = atom<DocState>({ document: seed, isLoading: !seed, notFound: false });
  const s = store;
  onMount(s, () => {
    // Keep in step with the global list while the dedicated watch warms up.
    const unlist = $documents.listen(() => {
      const d = listed(id);
      if (d && d !== s.get().document) s.set({ document: d, isLoading: false, notFound: false });
    });
    // An empty first answer can race a just-created file, so the seed stays. Once the server has
    // sent the document, an empty answer means it was deleted or this user's access was revoked
    // (the server only returns readable rows), so the document goes away.
    let delivered = false;
    const stop = watchQuery<Document>(
      "documents",
      (q) => q.where("id", "EQUAL", id),
      (rows) => {
        const d = rows[0] ?? null;
        if (d) delivered = true;
        if (!d && delivered) s.set({ document: null, isLoading: false, notFound: true });
        else s.set({ document: d ?? s.get().document, isLoading: false, notFound: !d && !s.get().document });
      },
    );
    return () => {
      unlist();
      stop();
      stores.delete(id);
    };
  });
  stores.set(id, s);
  return s;
}

/** Seeds the store for a file just created here, so opening it never waits for (or races) the server echo. */
export function primeDocument(doc: Document) {
  if (!stores.has(doc.id)) documentStore(doc.id, doc);
}

export type DocumentAccess = "ok" | "denied" | "missing" | "loading";

/** Live document plus whether the signed-in user may open it. */
export function useLiveDocument(documentId: string) {
  const store = useMemo(() => documentStore(documentId), [documentId]);
  const { document, isLoading, notFound } = useStore(store);
  const user = useStore($auth).user;

  let access: DocumentAccess = "loading";
  if (document && user) {
    const shared = document.sharing?.sharedWith?.some(
      (s) => s.status === "active" && (s.userId === user.id || sameEmail(s.email, user.email)),
    );
    access = document.owner === user.id || shared ? "ok" : "denied";
  } else if (!isLoading && notFound) {
    access = "missing";
  }
  return { document: access === "ok" ? document : null, access };
}
