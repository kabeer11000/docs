import { clear, createStore, get, set, type UseStore } from "idb-keyval";
import { atom, onMount, type ReadableAtom, type WritableAtom } from "nanostores";

export type Stop = () => void;
export type StartWatch<T> = (emit: (value: T) => void) => Stop | undefined;

const stores = new Map<string, WritableAtom<unknown>>();

// ---------------------------------------------------------------- IndexedDB cache

let idb: UseStore | null | undefined;
const db = () => {
  if (idb === undefined) idb = typeof indexedDB === "undefined" ? null : createStore("docs-live-queries", "v1");
  return idb;
};
const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();
const WRITE_DELAY_MS = 1500;

/** Last value saved for `key` (from an earlier visit), if any. */
export function readPersisted<T>(key: string): Promise<T | undefined> {
  const store = db();
  return store ? get<T>(key, store).catch(() => undefined) : Promise.resolve(undefined);
}

/** Saves `value` for the next visit; bursts of updates collapse into one write. */
export function persist(key: string, value: unknown) {
  const store = db();
  if (!store) return;
  clearTimeout(pendingWrites.get(key));
  pendingWrites.set(
    key,
    setTimeout(() => {
      pendingWrites.delete(key);
      set(key, value, store).catch(() => {});
    }, WRITE_DELAY_MS),
  );
}

/** Drops every saved value (sign-out). */
export function clearPersistedWatches() {
  for (const t of pendingWrites.values()) clearTimeout(t);
  pendingWrites.clear();
  const store = db();
  if (store) clear(store).catch(() => {});
}

// ---------------------------------------------------------------- shared watches

/**
 * Stale-while-revalidate live query, one per key.
 * Every subscriber of a key shares a single watch. The last emitted value
 * outlives unmounts, so a view that remounts renders it on its first frame
 * while the watch restarts and replaces it. nanostores keeps the watch alive
 * for ~1s after the last subscriber leaves, which covers page switches.
 * With `persist`, the value is also kept in IndexedDB, so the first paint of a
 * new visit shows the last known rows while the watch revalidates them.
 */
export function sharedWatch<T>(
  key: string,
  start: StartWatch<T>,
  opts: { persist?: boolean } = {},
): ReadableAtom<T | undefined> {
  let store = stores.get(key) as WritableAtom<T | undefined> | undefined;
  if (!store) {
    const created = atom<T | undefined>(undefined);
    let live = false;
    onMount(created, () => {
      if (opts.persist && created.get() === undefined) {
        readPersisted<T>(key).then((saved) => {
          if (!live && saved !== undefined && created.get() === undefined) created.set(saved);
        });
      }
      return start((value) => {
        live = true;
        created.set(value);
        if (opts.persist) persist(key, value);
      });
    });
    stores.set(key, created as WritableAtom<unknown>);
    store = created;
  }
  return store;
}

/** Forgets every cached value. Test-only. */
export function clearSharedWatches() {
  stores.clear();
}
