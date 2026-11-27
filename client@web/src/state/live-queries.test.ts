import { atom } from "nanostores";
import { afterEach, describe, expect, it, vi } from "vitest";

const watches: { collection: string; filters: unknown[]; emit: (rows: unknown[]) => void; stopped: boolean }[] = [];
vi.mock("@/lib/cloudstore", () => ({
  watchQuery: (collection: string, build: (q: unknown) => unknown, onRows: (rows: unknown[]) => void) => {
    const filters: unknown[] = [];
    const q = {
      where: (field: string, op: string, value: unknown) => (filters.push({ field, op, value }), q),
      orderBy: () => q,
      limit: () => q,
    };
    build(q);
    const w = { collection, filters, emit: onRows, stopped: false };
    watches.push(w);
    return () => {
      w.stopped = true;
    };
  },
}));
vi.mock("@/state/auth", () => ({ $auth: atom({ isAuthenticated: false, user: null }) }));

const { $documentsLoading, $rawDocuments, HOME_LIST_LIMIT } = await import("@/state/cloudstore-data");
const { ownedCountWatch, sharedDocumentsWatch } = await import("@/state/live-queries");
const { clearSharedWatches } = await import("@/lib/swr-watch");

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `d${i}` })) as never[];

describe("live queries", () => {
  afterEach(() => {
    watches.length = 0;
    clearSharedWatches();
  });

  it("counts owned documents from the Home list until it hits its limit", () => {
    vi.useFakeTimers();
    const store = ownedCountWatch("u1");
    const off = store.listen(() => {});
    expect(watches).toHaveLength(0);

    $rawDocuments.set(rows(3));
    $documentsLoading.set(false);
    expect(store.get()).toBe(3);
    expect(watches).toHaveLength(0);

    $rawDocuments.set(rows(HOME_LIST_LIMIT));
    expect(watches).toHaveLength(1);
    watches[0].emit(rows(250));
    expect(store.get()).toBe(250);

    $rawDocuments.set(rows(5));
    expect(store.get()).toBe(5);
    vi.advanceTimersByTime(1500); // nanostores lets an unwatched store linger ~1s
    expect(watches[0].stopped).toBe(true);
    off();
    vi.useRealTimers();
  });

  it("asks the server for shares to the lowercased email, excluding Trash", () => {
    const off = sharedDocumentsWatch(" Ann@X.com ").listen(() => {});
    expect(watches[0].filters).toEqual([
      { field: "sharing.sharedWith.email", op: "EQUAL", value: "ann@x.com" },
      { field: "trashedAt", op: "EQUAL", value: null },
    ]);
    expect(sharedDocumentsWatch("ann@x.com")).toBe(sharedDocumentsWatch("ANN@x.com"));
    off();
  });
});
