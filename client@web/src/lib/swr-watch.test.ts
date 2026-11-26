import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearSharedWatches, sharedWatch } from "./swr-watch";

describe("sharedWatch", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    clearSharedWatches();
  });

  const fakeWatch = () => {
    const calls = { starts: 0, stops: 0, emit: (_v: string[]) => {} };
    const start = (emit: (v: string[]) => void) => {
      calls.starts++;
      calls.emit = emit;
      return () => {
        calls.stops++;
      };
    };
    return { calls, start };
  };

  it("shares one watch between subscribers of the same key", () => {
    const { calls, start } = fakeWatch();
    const a = sharedWatch("q", start);
    const b = sharedWatch("q", start);
    expect(a).toBe(b);
    const seenA: unknown[] = [];
    const seenB: unknown[] = [];
    const offA = a.listen((v) => seenA.push(v));
    const offB = b.listen((v) => seenB.push(v));
    expect(calls.starts).toBe(1);
    calls.emit(["x"]);
    expect(seenA).toEqual([["x"]]);
    expect(seenB).toEqual([["x"]]);
    offA();
    offB();
  });

  it("keeps different keys apart", () => {
    const one = fakeWatch();
    const two = fakeWatch();
    const off1 = sharedWatch("one", one.start).listen(() => {});
    const off2 = sharedWatch("two", two.start).listen(() => {});
    one.calls.emit(["1"]);
    expect(sharedWatch("one", one.start).get()).toEqual(["1"]);
    expect(sharedWatch("two", two.start).get()).toBeUndefined();
    off1();
    off2();
  });

  it("serves the last value after remount and revalidates with a fresh watch", () => {
    const { calls, start } = fakeWatch();
    const store = sharedWatch("q", start);
    const off = store.listen(() => {});
    calls.emit(["old"]);
    off();
    vi.advanceTimersByTime(1500);
    expect(calls.stops).toBe(1);

    // Remount: the stale value is there on the first read, before the watch fires.
    const seen: unknown[] = [];
    const off2 = store.subscribe((v) => seen.push(v));
    expect(seen).toEqual([["old"]]);
    expect(calls.starts).toBe(2);
    calls.emit(["new"]);
    expect(seen).toEqual([["old"], ["new"]]);
    off2();
  });

  it("does not restart the watch for a quick unmount and remount", () => {
    const { calls, start } = fakeWatch();
    const store = sharedWatch("q", start);
    const off = store.listen(() => {});
    off();
    vi.advanceTimersByTime(200);
    const off2 = store.listen(() => {});
    vi.advanceTimersByTime(2000);
    expect(calls.starts).toBe(1);
    expect(calls.stops).toBe(0);
    off2();
  });

  it("tolerates a watch that could not start", () => {
    const store = sharedWatch<string[]>("none", () => undefined);
    const off = store.listen(() => {});
    off();
    expect(() => vi.advanceTimersByTime(1500)).not.toThrow();
    expect(store.get()).toBeUndefined();
  });
});
