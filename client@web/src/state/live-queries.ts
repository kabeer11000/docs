import type { Document, IComment, IFolderItem } from "@shared-types";
import { atom, type ReadableAtom } from "nanostores";
import { type QueryBuilder, watchQuery } from "@/lib/cloudstore";
import { sharedWatch } from "@/lib/swr-watch";
import { $documentsLoading, $rawDocuments, HOME_LIST_LIMIT } from "@/state/cloudstore-data";
import { isTrashed } from "@/state/file-logic";
import type { ChatConversation } from "@/hooks/use-cloudstore";

/** Cached, shared watch: one per key, however many components read it. */
function cloudWatch<Row, T = Row[]>(
  key: string,
  collection: string,
  build: (q: QueryBuilder) => QueryBuilder,
  select: (rows: Row[]) => T = (rows) => rows as T,
  opts: { persist?: boolean } = {},
): ReadableAtom<T | undefined> {
  return sharedWatch<T>(key, (emit) => watchQuery<Row>(collection, build, (rows) => emit(select(rows))), opts);
}

/** Stand-in store while there is no user, so hooks can call useStore unconditionally. */
export const $nothing: ReadableAtom<undefined> = atom(undefined);

/** Lists exclude Trash on the server, so trashed rows never use up a query's limit. */
const notTrashed = (q: QueryBuilder) => q.where("trashedAt", "EQUAL", null);

/** Every owned document, for the storage line when the Home list is cut off at its limit. */
const allOwnedDocumentsWatch = (userId: string) =>
  cloudWatch<{ id: string; trashedAt?: string | null }, number>(
    `owned-count:${userId}`,
    "documents",
    (q) => notTrashed(q.where("owner", "EQUAL", userId)),
    (rows) => rows.filter((r) => !isTrashed(r)).length,
  );

/**
 * Number of documents the user owns (the storage line). The Home list already holds every owned
 * document unless it hit its limit, so only then is the full (heavy) list watched.
 */
export const ownedCountWatch = (userId: string) =>
  sharedWatch<number>(`owned-count-derived:${userId}`, (emit) => {
    let stopFull: (() => void) | undefined;
    const update = () => {
      if ($documentsLoading.get()) return;
      const rows = $rawDocuments.get();
      if (rows.length < HOME_LIST_LIMIT) {
        stopFull?.();
        stopFull = undefined;
        emit(rows.filter((r) => !isTrashed(r)).length);
      } else if (!stopFull) {
        stopFull = allOwnedDocumentsWatch(userId).subscribe((n) => {
          if (n !== undefined) emit(n);
        });
      }
    };
    const offRows = $rawDocuments.listen(update);
    const offLoading = $documentsLoading.listen(update);
    update();
    return () => {
      offRows();
      offLoading();
      stopFull?.();
    };
  });

/**
 * Documents shared with this email, newest first. Shares are stored with lowercased emails, and the
 * server also limits results to documents the caller may read; callers drop the user's own files.
 */
export const sharedDocumentsWatch = (email: string) => {
  const normalized = email.trim().toLowerCase();
  return cloudWatch<Document>(
    `shared-docs:${normalized}`,
    "documents",
    (q) =>
      notTrashed(q.where("sharing.sharedWith.email", "EQUAL", normalized))
        .orderBy("updatedAt", "DESCENDING")
        .limit(100),
    (rows) => rows.filter((r) => !isTrashed(r)),
    { persist: true },
  );
};

/** A document's comments, newest first (duplicate ids dropped). */
export const commentsWatch = (documentId: string) =>
  cloudWatch<IComment>(
    `comments:${documentId}`,
    "comments",
    (q) => q.where("documentId", "EQUAL", documentId),
    (rows) =>
      [...new Map(rows.map((c) => [c.id, c])).values()].sort(
        (a, b) =>
          new Date(b.timestamp.createdAt).getTime() -
          new Date(a.timestamp.createdAt).getTime(),
      ),
  );

/** The user's AI chats, most recent first. */
export const chatsWatch = (userId: string) =>
  cloudWatch<ChatConversation>(
    `chats:${userId}`,
    "chats",
    (q) => q.where("owner", "EQUAL", userId).orderBy("lastMessageAt", "DESCENDING"),
    (rows) => [...new Map(rows.map((c) => [c.id, c])).values()],
  );

/** One folder by id, for folders the Home list does not hold (past its limit). */
export const folderWatch = (folderId: string) =>
  cloudWatch<IFolderItem, IFolderItem | null>(
    `folder:${folderId}`,
    "folders",
    (q) => q.where("id", "EQUAL", folderId),
    (rows) => rows[0] ?? null,
  );

export type TrashedRow = {
  id: string;
  trashedAt: string;
  trashedFrom?: string;
  title?: string;
  name?: string;
  kind?: "doc" | "sheet" | "slides";
  parents?: string[];
  location?: string;
};

/** The user's files or folders in Trash, newest first. GREATER "" matches set ISO strings only. */
export const trashedWatch = (
  userId: string,
  collection: "documents" | "folders",
) =>
  cloudWatch<TrashedRow>(`trashed:${collection}:${userId}`, collection, (q) =>
    q
      .where(
        collection === "documents" ? "owner" : "permissions.owner",
        "EQUAL",
        userId,
      )
      .where("trashedAt", "GREATER", "")
      .orderBy("trashedAt", "DESCENDING")
      .limit(500),
  );
