import { beforeEach, describe, expect, it, vi } from "vitest";

// Minimal stand-in for HocuspocusProvider: an event emitter with the fields collab-room reads.
const created: FakeProvider[] = [];
class FakeProvider {
  handlers = new Map<string, Set<() => void>>();
  destroyed = false;
  isSynced = false;
  configuration: { websocketProvider: { status: string }; document: unknown; name: string };
  constructor(opts: { document: unknown; name: string }) {
    this.configuration = { websocketProvider: { status: "connecting" }, document: opts.document, name: opts.name };
    created.push(this);
  }
  on(e: string, fn: () => void) {
    if (!this.handlers.has(e)) this.handlers.set(e, new Set());
    this.handlers.get(e)?.add(fn);
  }
  off(e: string, fn: () => void) {
    this.handlers.get(e)?.delete(fn);
  }
  emit(e: string) {
    for (const fn of [...(this.handlers.get(e) ?? [])]) fn();
  }
  destroy() {
    this.destroyed = true;
  }
}

vi.stubEnv("NEXT_PUBLIC_HOCUSPOCUS_URL", "wss://collab.test");
vi.mock("@hocuspocus/provider", () => ({ HocuspocusProvider: FakeProvider, WebSocketStatus: { Connected: "connected" } }));
vi.mock("@/lib/auth/manager", () => ({
  authManager: { currentState: { tokens: { accessToken: "t" } }, isTokenExpired: () => false, refreshToken: async () => {} },
}));

const { warmRoom, roomDoc, joinRoom, onRoom } = await import("./collab-room");

beforeEach(() => {
  created.length = 0;
  vi.useFakeTimers();
});

describe("warm live rooms", () => {
  it("adopts the warmed connection and doc", () => {
    warmRoom("a");
    expect(created).toHaveLength(1);
    const doc = roomDoc("a");
    expect(doc).toBe(created[0].configuration.document);
    const hp = joinRoom("a", doc);
    expect(hp).toBe(created[0]);
    expect(created).toHaveLength(1);
    // Adopted: the warm timer no longer closes it.
    vi.advanceTimersByTime(20000);
    expect(created[0].destroyed).toBe(false);
  });

  it("warming twice keeps one connection", () => {
    warmRoom("b");
    warmRoom("b");
    expect(created).toHaveLength(1);
    joinRoom("b", roomDoc("b"));
  });

  it("closes an unused warm room after 15s and then connects fresh", () => {
    warmRoom("c");
    vi.advanceTimersByTime(15001);
    expect(created[0].destroyed).toBe(true);
    const doc = roomDoc("c");
    expect(doc).not.toBe(created[0].configuration.document);
    joinRoom("c", doc);
    expect(created).toHaveLength(2);
  });

  it("never adopts a warm connection that dropped", () => {
    warmRoom("d");
    created[0].emit("disconnect");
    expect(created[0].destroyed).toBe(true);
    joinRoom("d", roomDoc("d"));
    expect(created).toHaveLength(2);
  });

  it("keeps a claimed doc when the warm connection drops before joining", () => {
    warmRoom("e");
    const doc = roomDoc("e") as { isDestroyed?: boolean };
    created[0].emit("authenticationFailed");
    expect(created[0].destroyed).toBe(true);
    expect(doc.isDestroyed).toBe(false);
    const hp = joinRoom("e", doc as never);
    expect(hp).toBe(created[1]);
    expect(created[1].configuration.document).toBe(doc);
  });

  it("does not adopt a warm connection for a different doc", () => {
    warmRoom("f");
    const other = roomDoc("zzz");
    const hp = joinRoom("f", other);
    expect(created[0].destroyed).toBe(true);
    expect(hp).toBe(created[1]);
  });

  it("onRoom replays states already reached and unwires", () => {
    warmRoom("g");
    const hp = joinRoom("g", roomDoc("g")) as unknown as FakeProvider;
    hp.configuration.websocketProvider.status = "connected";
    hp.isSynced = true;
    const calls: string[] = [];
    const unwire = onRoom(hp as never, {
      connect: () => calls.push("connect"),
      synced: () => calls.push("synced"),
      authenticationFailed: () => calls.push("auth"),
      disconnect: () => calls.push("disconnect"),
    });
    expect(calls).toEqual(["connect", "synced"]);
    hp.emit("disconnect");
    unwire();
    hp.emit("disconnect");
    expect(calls).toEqual(["connect", "synced", "disconnect"]);
  });
});
