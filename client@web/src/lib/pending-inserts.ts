// Files created here are opened before the server confirms the insert (instant "New"). Anything
// that needs the row to exist on the server (the live room checks it) waits on this first.
const pending = new Map<string, Promise<unknown>>();

export function trackInsert(id: string, insert: Promise<unknown>) {
  const p = insert.finally(() => {
    if (pending.get(id) === p) pending.delete(id);
  });
  pending.set(id, p);
  return p;
}

/** Resolves once a just-created file is on the server (immediately for any other id). Never rejects. */
export const insertSettled = (id: string) => (pending.get(id) ?? Promise.resolve()).catch(() => undefined);
