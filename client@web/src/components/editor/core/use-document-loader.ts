import { useStore } from "@nanostores/react";
import type { Document } from "@shared-types";
import { atom, onMount, type WritableAtom } from "nanostores";
import { useMemo } from "react";
import cloudStore from "@/lib/cloudstore";
import { $auth } from "@/state/auth";
import { $documents } from "@/state/cloudstore-data";

interface DocState {
  document: Document | null;
  isLoading: boolean;
  notFound: boolean;
}

// One live store per document id, shared by the header and the editor (previously each opened its
// own watcher). Seeded from the Home documents list so a document opened from Home renders at once.
const stores = new Map<string, WritableAtom<DocState>>();

function documentStore(id: string, primed?: Document): WritableAtom<DocState> {
  let store = stores.get(id);
  if (store) return store;
  const seed = primed ?? $documents.get().find((d) => d.id === id) ?? null;
  store = atom<DocState>({ document: seed, isLoading: !seed, notFound: false });
  const s = store;
  onMount(s, () => {
    let watcher: { stop?: () => void; destroy?: () => void } | null = null;
    // Keep in step with the global list while the dedicated watcher warms up.
    const unlist = $documents.listen((docs) => {
      const d = docs.find((x) => x.id === id);
      if (d && d !== s.get().document) s.set({ document: d, isLoading: false, notFound: false });
    });
    try {
      const query = cloudStore.query.where("id", "EQUAL", id);
      watcher = cloudStore.collection("documents").watch(query, ({ collection }: { collection: Document[] }) => {
        const d = collection?.[0] ?? null;
        s.set({ document: d ?? s.get().document, isLoading: false, notFound: !d && !s.get().document });
      });
    } catch (error) {
      console.error("[document] watch failed", error);
      s.set({ ...s.get(), isLoading: false });
    }
    return () => {
      unlist();
      watcher?.stop?.();
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
      (s) => s.status === "active" && (s.userId === user.id || s.email === user.email),
    );
    access = document.owner === user.id || shared ? "ok" : "denied";
  } else if (!isLoading && notFound) {
    access = "missing";
  }
  return { document: access === "ok" ? document : null, access };
}
