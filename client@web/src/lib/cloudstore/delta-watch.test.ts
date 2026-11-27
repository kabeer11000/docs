import { describe, expect, it, vi } from "vitest";
import { applyDelta, deltaWatch, enableDeltaWatch } from "./delta-watch";

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
  const fakeSocket = (connected = true) => {
    const handlers = new Map<string, (m: unknown) => void>();
    return {
      connected, handlers, emit: vi.fn(),
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

    expect(socket.handlers.has("connect")).toBe(true);
    w.stop();
    w.stop();
    expect(socket.handlers.size).toBe(0);
    expect(socket.emit).toHaveBeenLastCalledWith(`watch:${w.id}:close`, { stream: { id: w.id } });
    expect(socket.emit).toHaveBeenCalledTimes(2);
  });

  it("subscribes on connect when the socket is not connected yet, and again on reconnect", () => {
    const socket = fakeSocket(false);
    const w = deltaWatch(socket, "db", "docs", { filters: [], limit: null }, vi.fn());
    expect(socket.emit).not.toHaveBeenCalled();
    socket.handlers.get("connect")!(undefined);
    socket.handlers.get("connect")!(undefined);
    expect(socket.emit).toHaveBeenCalledTimes(2);
    expect(socket.emit.mock.calls[1][1].stream.id).toBe(w.id);
    w.stop();
  });
});

describe("enableDeltaWatch", () => {
  class Store {
    internals = { contexts: {} as Record<string, unknown>, socket: {}, constructorConfig: { database: { name: "db" } } };
    get info() {
      return this.internals;
    }
    opened = 0;
    collection(name: string) {
      this.opened++;
      return { name };
    }
    get query() {
      const id = String(Object.keys(this.internals.contexts).length + Math.random());
      const builder = { _query: { id } };
      this.internals.contexts[id] = builder;
      return builder;
    }
  }

  it("opens each collection once and does not retain query builders", () => {
    const store = enableDeltaWatch(new Store());
    const a = store.collection("documents") as { watch?: unknown };
    expect(store.collection("documents")).toBe(a);
    expect(a.watch).toBeTypeOf("function");
    store.collection("folders");
    expect(store.opened).toBe(2);
    expect(store.query._query.id).toBeTruthy();
    expect(Object.keys(store.internals.contexts)).toHaveLength(0);
  });
});
