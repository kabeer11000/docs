import type { IComment, ICommentReply } from "@shared-types";

/** A stored comment thread. Fields past IComment are optional so older rows still read. */
export type Thread = Omit<IComment, "replies"> & {
  /** The commented text when the thread was made; finds the anchor again if its mark is lost. */
  quote?: string;
  /** Emails of people @mentioned in the root comment. */
  mentions?: string[];
  editedAt?: string;
  replies: Reply[];
};
export type Reply = ICommentReply & { editedAt?: string };

export type Anchor = { from: number; to: number };
export type ThreadFilter = "all" | "open" | "resolved" | "mine";
export const FILTERS: { id: ThreadFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "resolved", label: "Resolved" },
  { id: "mine", label: "Mine" },
];

/** Threads the user started or replied to. */
export const isMine = (t: Thread, userId: string) =>
  !!userId &&
  (t.author.id === userId || t.replies.some((r) => r.author.id === userId));

export function matchesFilter(t: Thread, filter: ThreadFilter, userId: string) {
  if (filter === "open") return !t.resolved;
  if (filter === "resolved") return t.resolved;
  if (filter === "mine") return isMine(t, userId);
  return true;
}

export function countThreads(
  threads: Thread[],
  userId: string,
): Record<ThreadFilter, number> {
  const counts = { all: 0, open: 0, resolved: 0, mine: 0 };
  for (const t of threads) {
    for (const f of FILTERS) if (matchesFilter(t, f.id, userId)) counts[f.id]++;
  }
  return counts;
}

const created = (t: Thread) => t.timestamp.createdAt;

/**
 * Splits threads into those anchored in the text (in document order) and detached ones (anchor text
 * deleted), oldest first.
 */
export function orderThreads(
  threads: Thread[],
  anchors: ReadonlyMap<string, Anchor>,
) {
  const anchored: Thread[] = [];
  const detached: Thread[] = [];
  for (const t of threads) (anchors.has(t.id) ? anchored : detached).push(t);
  anchored.sort((a, b) => {
    const pa = anchors.get(a.id) as Anchor;
    const pb = anchors.get(b.id) as Anchor;
    return (
      pa.from - pb.from || pa.to - pb.to || created(a).localeCompare(created(b))
    );
  });
  detached.sort((a, b) => created(a).localeCompare(created(b)));
  return { anchored, detached };
}

export interface Override {
  documentId: string;
  /** null = deleted. */
  thread: Thread | null;
  /** updatedAt of the optimistic write; a live row at least this new already reflects it. */
  at: string;
}

/** Live rows with local writes laid over them until the server echoes them back. */
export function mergeOptimistic(
  live: Thread[],
  overrides: Record<string, Override>,
  documentId: string,
): Thread[] {
  const own = Object.entries(overrides).filter(
    ([, o]) => o.documentId === documentId,
  );
  if (!own.length) return live;
  const byId = new Map(own);
  const seen = new Set<string>();
  const merged: Thread[] = [];
  for (const row of live) {
    seen.add(row.id);
    const o = byId.get(row.id);
    if (!o) merged.push(row);
    else if (o.thread)
      merged.push(row.timestamp.updatedAt >= o.at ? row : o.thread);
  }
  const added = own
    .filter(([id, o]) => o.thread && !seen.has(id))
    .map(([, o]) => o.thread as Thread);
  return [...added, ...merged];
}

export interface CommentAbilities {
  userId: string;
  canComment: boolean;
  /** Document owner: may delete anyone's comment. */
  isOwner: boolean;
  /** May edit the document: may resolve anyone's thread. */
  canEditDoc: boolean;
}

export const canEditItem = (a: CommentAbilities, authorId: string) =>
  a.canComment && authorId === a.userId;
export const canDeleteItem = (a: CommentAbilities, authorId: string) =>
  !!a.userId && (authorId === a.userId || a.isOwner);
export const canResolve = (a: CommentAbilities, t: Thread) =>
  a.canComment && (a.canEditDoc || t.author.id === a.userId);
