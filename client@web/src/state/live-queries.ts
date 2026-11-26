import type { Document } from "@shared-types";
import { atom, type ReadableAtom } from "nanostores";
import cloudStore from "@/lib/cloudstore";
import { type Stop, sharedWatch } from "@/lib/swr-watch";
import { $auth } from "@/state/auth";

// The cloudstore query builder is untyped.
// biome-ignore lint/suspicious/noExplicitAny: third-party builder without types
type QueryBuilder = any;

/**
 * Cached, shared cloudstore watch. Restarts when the access token changes,
 * because lib/cloudstore replaces its client (and socket) on every new token.
 */
function cloudWatch<Row, T = Row[]>(
  key: string,
  collection: string,
  build: (q: QueryBuilder) => QueryBuilder,
  select: (rows: Row[]) => T = (rows) => rows as T,
): ReadableAtom<T | undefined> {
  return sharedWatch<T>(key, (emit) => {
    let token: string | undefined;
    let stop: Stop | undefined;
    const unsubscribe = $auth.subscribe(({ tokens }) => {
      if (tokens?.accessToken === token) return;
      token = tokens?.accessToken;
      stop?.();
      stop = undefined;
      if (!token || !cloudStore.query) return;
      try {
        const watcher = cloudStore
          .collection(collection)
          .watch(build(cloudStore.query), (r: { collection?: Row[]; error?: unknown }) => {
            if (!r?.error && r?.collection) emit(select(r.collection));
          });
        stop = () => watcher?.stop?.();
      } catch (error) {
        console.error(`Failed to watch ${key}:`, error);
      }
    });
    return () => {
      unsubscribe();
      stop?.();
    };
  });
}

/** Stand-in store while there is no user, so hooks can call useStore unconditionally. */
export const $nothing: ReadableAtom<undefined> = atom(undefined);

export type StarredItem = { id: string; title?: string; name?: string };

export const starredWatch = (userId: string, collection: "documents" | "folders") =>
  cloudWatch<StarredItem>(`starred:${collection}:${userId}`, collection, (q) =>
    q
      .where(collection === "documents" ? "owner" : "permissions.owner", "EQUAL", userId)
      .where("isStarred", "EQUAL", true)
      .orderBy("timestamp.updatedAt", "DESCENDING")
      .limit(10),
  );

/** Number of documents the user owns (the storage line). */
export const ownedCountWatch = (userId: string) =>
  cloudWatch<unknown, number>(
    `owned-count:${userId}`,
    "documents",
    (q) => q.where("owner", "EQUAL", userId).orderBy("timestamp.updatedAt", "DESCENDING"),
    (rows) => rows.length,
  );

/** Every shared document visible to the user; callers filter to "shared with me". */
export const sharedDocumentsWatch = (userId: string) =>
  cloudWatch<Document>(`shared-docs:${userId}`, "documents", (q) =>
    q.where("sharing.isShared", "EQUAL", true).orderBy("updatedAt", "DESCENDING").limit(100),
  );
