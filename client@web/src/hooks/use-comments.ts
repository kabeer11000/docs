import { useStore } from "@nanostores/react";
import { computed, map, type ReadableAtom } from "nanostores";
import { useMemo } from "react";
import {
  mergeOptimistic,
  type Override,
  type Reply,
  type Thread,
} from "@/components/editor/comments/threads";
import cloudStore from "@/lib/cloudstore";
import { $auth } from "@/state/auth";
import { $nothing, commentsWatch } from "@/state/live-queries";

/**
 * A document's comment threads: one shared live watch per document (however many components ask),
 * with this tab's writes shown at once and rolled back if the server refuses them.
 */

const NO_THREADS: Thread[] = [];
/** Local writes by thread id, until the watch echoes them (or they fail). */
const $overrides = map<Record<string, Override>>({});
const ECHO_GRACE_MS = 10_000;

const threadStores = new Map<string, ReadableAtom<Thread[] | undefined>>();
function threadsStore(documentId: string) {
  let store = threadStores.get(documentId);
  if (!store) {
    store = computed(
      [commentsWatch(documentId), $overrides],
      (live, overrides) =>
        live === undefined
          ? undefined
          : mergeOptimistic(live as Thread[], overrides, documentId),
    );
    threadStores.set(documentId, store);
  }
  return store;
}

const now = () => new Date().toISOString();
const collection = () => cloudStore.collection("comments");
const byId = (id: string) => cloudStore.query.where("id", "EQUAL", id);

/**
 * Shows `next` (null = gone) for thread `id` right away, runs `write`, and undoes the local change
 * if it fails. Resolves to whether the server accepted it.
 */
async function commit(
  documentId: string,
  id: string,
  next: Thread | null,
  write: () => Promise<unknown>,
) {
  const before = $overrides.get()[id];
  const mine: Override = {
    documentId,
    thread: next,
    at: next?.timestamp.updatedAt ?? now(),
  };
  $overrides.setKey(id, mine);
  const settle = () => {
    if ($overrides.get()[id] !== mine) return;
    const { [id]: _, ...rest } = $overrides.get();
    $overrides.set(before ? { ...rest, [id]: before } : rest);
  };
  try {
    if (!cloudStore?.collection) throw new Error("Not connected");
    await write();
    // The watch normally echoes within a moment; afterwards the live row is the truth.
    setTimeout(settle, ECHO_GRACE_MS);
    return true;
  } catch (error) {
    console.error("[comments] write failed:", error);
    settle();
    return false;
  }
}

export function useComments(documentId: string) {
  const store = documentId ? threadsStore(documentId) : $nothing;
  const live = useStore(store);
  const threads = live ?? NO_THREADS;
  const { user } = useStore($auth);

  const actions = useMemo(() => {
    const me = user
      ? {
          id: user.id,
          name: user.displayName || user.email || "Anonymous",
          email: user.email || undefined,
          avatar: user.photoURL || undefined,
        }
      : null;
    // Always the latest copy (another person may have replied since this render).
    const current = (id: string) =>
      (store.get() as Thread[] | undefined)?.find((t) => t.id === id);
    const patch = (
      id: string,
      change: (t: Thread, at: string) => Partial<Thread>,
    ) => {
      const t = current(id);
      if (!t) return Promise.resolve(false);
      const at = now();
      const fields = {
        ...change(t, at),
        timestamp: { ...t.timestamp, updatedAt: at },
      };
      // ponytail: replies are one array written whole, so two replies in the same instant can drop one.
      // Move replies to their own rows (or a server-side push) if that shows up.
      return commit(documentId, id, { ...t, ...fields }, () =>
        collection().update(byId(id), fields),
      );
    };

    return {
      create(input: {
        id: string;
        content: string;
        range: { from: number; to: number };
        quote: string;
        mentions: string[];
      }) {
        if (!me) return Promise.resolve(false);
        const at = now();
        const thread: Thread = {
          id: input.id,
          documentId,
          content: input.content,
          author: me,
          range: input.range,
          quote: input.quote,
          mentions: input.mentions,
          resolved: false,
          replies: [],
          timestamp: { createdAt: at, updatedAt: at },
        };
        return commit(documentId, thread.id, thread, () =>
          collection().insert(thread),
        );
      },
      reply(threadId: string, content: string, id: string) {
        if (!me) return Promise.resolve(false);
        return patch(threadId, (t, at) => {
          const reply: Reply = {
            id,
            commentId: threadId,
            content,
            author: me,
            timestamp: { createdAt: at, updatedAt: at },
          };
          return { replies: [...t.replies, reply] };
        });
      },
      edit(threadId: string, content: string, mentions: string[]) {
        return patch(threadId, (_, at) => ({
          content,
          mentions,
          editedAt: at,
        }));
      },
      editReply(threadId: string, replyId: string, content: string) {
        return patch(threadId, (t, at) => ({
          replies: t.replies.map((r) =>
            r.id === replyId
              ? {
                  ...r,
                  content,
                  editedAt: at,
                  timestamp: { ...r.timestamp, updatedAt: at },
                }
              : r,
          ),
        }));
      },
      deleteReply(threadId: string, replyId: string) {
        return patch(threadId, (t) => ({
          replies: t.replies.filter((r) => r.id !== replyId),
        }));
      },
      setResolved(threadId: string, resolved: boolean) {
        return patch(threadId, () => ({ resolved }));
      },
      remove(threadId: string) {
        return commit(documentId, threadId, null, () =>
          collection().remove(byId(threadId)),
        );
      },
    };
  }, [documentId, store, user]);

  const openCount = useMemo(
    () => threads.filter((t) => !t.resolved).length,
    [threads],
  );
  return {
    threads,
    openCount,
    isLoading: !!documentId && live === undefined,
    /** Stable per document and user; each resolves to whether the server accepted the write. */
    actions,
  };
}
