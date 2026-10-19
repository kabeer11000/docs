import { describe, expect, it, vi } from "vitest";
import { applyDelta, deltaWatch } from "./delta-watch";

const doc = (id: string, n: number) => ({ _id: id, n });
const asc = { field: "n", direction: "ASCENDING" as const };

describe("applyDelta", () => {
  it("replaces, removes and re-sorts with _id tie-break", () => {
    const docs = [doc("a", 1), doc("b", 2)];
    const next = applyDelta(docs, { upsert: [doc("c", 1), doc("b", 0)], remove: ["a"] }, asc);
    expect(next.map((d) => d._id)).toEqual(["b", "c"]);
  });

  it("keeps untouched docs by identity and enforces limit", () => {
    const a = doc("a", 1);
    const next = applyDelta([a, doc("b", 2)], { upsert: [doc("c", 0)], remove: [] }, asc, 2);
    expect(next.map((d) => d._id)).toEqual(["c", "a"]);
    expect(next[1]).toBe(a);
  });
});

describe("deltaWatch", () => {
  const fakeSocket = () => {
    const handlers = new Map<string, (m: unknown) => void>();
    const io = { on: vi.fn(), off: vi.fn() };
    return {
      io, handlers, emit: vi.fn(),
      on: (ev: string, fn: (m: unknown) => void) => handlers.set(ev, fn),
      off: (ev: string) => handlers.delete(ev),
    };
  };

  it("builds the list from a snapshot then deltas, and stops cleanly", () => {
    const socket = fakeSocket();
    const onUpdate = vi.fn();
    const w = deltaWatch(socket, "db", "docs", { filters: [], orderBy: asc, limit: null }, onUpdate);
    expect(socket.emit.mock.calls[0][1].delta).toBe(true);

    const fire = socket.handlers.get(`watchable-change-${w.id}`)!;
    fire({ collection: [doc("a", 1)], _update: { operationType: "initial" } });
    fire({ delta: { upsert: [doc("b", 0)], remove: [] }, _update: { operationType: "insert" } });
    expect(onUpdate.mock.calls[1][0].collection.map((d: any) => d._id)).toEqual(["b", "a"]);

    expect(socket.io.on).toHaveBeenCalledWith("reconnect", expect.any(Function));
    w.stop();
    w.stop();
    expect(socket.handlers.size).toBe(0);
    expect(socket.emit).toHaveBeenLastCalledWith(`watch:${w.id}:close`, { stream: { id: w.id } });
    expect(socket.emit).toHaveBeenCalledTimes(2);
  });
});
