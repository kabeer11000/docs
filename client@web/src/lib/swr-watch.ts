import { atom, onMount, type ReadableAtom, type WritableAtom } from "nanostores";

export type Stop = () => void;
export type StartWatch<T> = (emit: (value: T) => void) => Stop | undefined;

const stores = new Map<string, WritableAtom<unknown>>();

/**
 * Stale-while-revalidate live query, one per key.
 * Every subscriber of a key shares a single watch. The last emitted value
 * outlives unmounts, so a view that remounts renders it on its first frame
 * while the watch restarts and replaces it. nanostores keeps the watch alive
 * for ~1s after the last subscriber leaves, which covers page switches.
 */
export function sharedWatch<T>(
  key: string,
  start: StartWatch<T>,
): ReadableAtom<T | undefined> {
  let store = stores.get(key) as WritableAtom<T | undefined> | undefined;
  if (!store) {
    const created = atom<T | undefined>(undefined);
    onMount(created, () => start((value) => created.set(value)));
    stores.set(key, created as WritableAtom<unknown>);
    store = created;
  }
  return store;
}

/** Forgets every cached value. Test-only. */
export function clearSharedWatches() {
  stores.clear();
}
