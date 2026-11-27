import { describe, expect, it } from "vitest";
import { findQuote, stackCards } from "./layout";
import {
  decodeMentions,
  encodeMentions,
  matchPeople,
  mentionCandidates,
  mentionQuery,
  parseRichText,
  relativeTime,
} from "./rich-text";
import {
  type CommentAbilities,
  canDeleteItem,
  canEditItem,
  canResolve,
  countThreads,
  matchesFilter,
  mergeOptimistic,
  orderThreads,
  type Thread,
} from "./threads";

const thread = (id: string, o: Partial<Thread> = {}): Thread => ({
  id,
  documentId: "d1",
  content: id,
  author: { id: "u1", name: "Ana" },
  range: { from: 1, to: 2 },
  resolved: false,
  replies: [],
  timestamp: {
    createdAt: `2026-01-0${id.length}T00:00:00.000Z`,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  ...o,
});
const reply = (authorId: string) => ({
  id: `r-${authorId}`,
  commentId: "x",
  content: "r",
  author: { id: authorId, name: authorId },
  timestamp: {
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
});

describe("stackCards", () => {
  const h = 50;
  it("keeps cards at their text when there is room", () => {
    const out = stackCards(
      [
        { id: "a", top: 0, height: h },
        { id: "b", top: 200, height: h },
      ],
      null,
    );
    expect([...out]).toEqual([
      ["a", 0],
      ["b", 200],
    ]);
  });

  it("pushes overlapping cards down in text order", () => {
    const out = stackCards(
      [
        { id: "b", top: 10, height: h },
        { id: "a", top: 0, height: h },
        { id: "c", top: 20, height: h },
      ],
      null,
      8,
    );
    expect(out.get("a")).toBe(0);
    expect(out.get("b")).toBe(58);
    expect(out.get("c")).toBe(116);
  });

  it("aligns the active card exactly and moves earlier cards up", () => {
    const items = [
      { id: "a", top: 0, height: h },
      { id: "b", top: 20, height: h },
      { id: "c", top: 40, height: h },
    ];
    const out = stackCards(items, "c", 8);
    expect(out.get("c")).toBe(40);
    expect(out.get("b")).toBe(40 - 8 - h);
    expect(out.get("a")).toBe(40 - 8 - h - 8 - h);
  });

  it("pushes cards after the active one down", () => {
    const out = stackCards(
      [
        { id: "a", top: 0, height: h },
        { id: "b", top: 10, height: h },
      ],
      "a",
      8,
    );
    expect(out.get("a")).toBe(0);
    expect(out.get("b")).toBe(58);
  });

  it("never overlaps", () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      id: `${i}`,
      top: (i * 37) % 120,
      height: 30 + (i % 4) * 10,
    }));
    for (const active of [null, "7", "0", "19"]) {
      const out = stackCards(items, active, 6);
      const placed = items.map((i) => ({
        top: out.get(i.id) as number,
        bottom: (out.get(i.id) as number) + i.height,
      }));
      placed.sort((a, b) => a.top - b.top);
      for (let i = 1; i < placed.length; i++)
        expect(placed[i].top).toBeGreaterThanOrEqual(placed[i - 1].bottom + 6);
    }
  });

  it("ignores an unknown active id", () => {
    expect(stackCards([{ id: "a", top: 5, height: h }], "zzz").get("a")).toBe(
      5,
    );
  });
});

describe("findQuote", () => {
  // "Hello world" in one paragraph (text starts at 1), "Hello again" in the next (starts at 14).
  const segments = [
    { pos: 1, text: "Hello " },
    { pos: 7, text: "world" },
    { pos: 14, text: "Hello again" },
  ];
  it("maps a match across text nodes to document positions", () => {
    expect(findQuote(segments, "lo wor", 0)).toEqual({ from: 4, to: 10 });
  });
  it("picks the occurrence nearest to the old position", () => {
    expect(findQuote(segments, "Hello", 0)).toEqual({ from: 1, to: 6 });
    expect(findQuote(segments, "Hello", 15)).toEqual({ from: 14, to: 19 });
  });
  it("returns null when the text is gone", () => {
    expect(findQuote(segments, "missing", 0)).toBeNull();
    expect(findQuote(segments, "", 0)).toBeNull();
    expect(findQuote([], "x", 0)).toBeNull();
  });
});

describe("thread filtering and ordering", () => {
  const threads = [
    thread("a", { resolved: true }),
    thread("bb", { author: { id: "u2", name: "Bo" } }),
    thread("ccc", { author: { id: "u2", name: "Bo" }, replies: [reply("u1")] }),
    thread("dddd", { author: { id: "u3", name: "Cy" } }),
  ];
  it("filters", () => {
    expect(
      threads.filter((t) => matchesFilter(t, "open", "u1")).map((t) => t.id),
    ).toEqual(["bb", "ccc", "dddd"]);
    expect(
      threads
        .filter((t) => matchesFilter(t, "resolved", "u1"))
        .map((t) => t.id),
    ).toEqual(["a"]);
    expect(
      threads.filter((t) => matchesFilter(t, "mine", "u1")).map((t) => t.id),
    ).toEqual(["a", "ccc"]);
    expect(threads.filter((t) => matchesFilter(t, "mine", "")).length).toBe(0);
  });
  it("counts", () => {
    expect(countThreads(threads, "u1")).toEqual({
      all: 4,
      open: 3,
      resolved: 1,
      mine: 2,
    });
  });
  it("orders by position and splits off detached threads", () => {
    const anchors = new Map([
      ["a", { from: 30, to: 35 }],
      ["bb", { from: 5, to: 9 }],
      ["ccc", { from: 5, to: 7 }],
    ]);
    const { anchored, detached } = orderThreads(threads, anchors);
    expect(anchored.map((t) => t.id)).toEqual(["ccc", "bb", "a"]);
    expect(detached.map((t) => t.id)).toEqual(["dddd"]);
  });
});

describe("mergeOptimistic", () => {
  const live = [thread("a"), thread("bb")];
  it("returns live rows untouched without overrides", () => {
    expect(mergeOptimistic(live, {}, "d1")).toBe(live);
  });
  it("adds pending inserts and hides pending deletes", () => {
    const merged = mergeOptimistic(
      live,
      {
        n: { documentId: "d1", thread: thread("n"), at: "2026-02-01" },
        a: { documentId: "d1", thread: null, at: "2026-02-01" },
        other: { documentId: "d2", thread: thread("other"), at: "2026-02-01" },
      },
      "d1",
    );
    expect(merged.map((t) => t.id)).toEqual(["n", "bb"]);
  });
  it("prefers the local edit until the server row catches up", () => {
    const edited = thread("a", {
      content: "edited",
      timestamp: { createdAt: "x", updatedAt: "2026-03-01T00:00:00.000Z" },
    });
    const ov = {
      a: { documentId: "d1", thread: edited, at: edited.timestamp.updatedAt },
    };
    expect(mergeOptimistic(live, ov, "d1")[0].content).toBe("edited");
    const caughtUp = [{ ...edited, content: "server" }, live[1]];
    expect(mergeOptimistic(caughtUp, ov, "d1")[0].content).toBe("server");
  });
});

describe("permissions", () => {
  const me: CommentAbilities = {
    userId: "u1",
    canComment: true,
    isOwner: false,
    canEditDoc: false,
  };
  it("only authors edit, authors and owners delete", () => {
    expect(canEditItem(me, "u1")).toBe(true);
    expect(canEditItem(me, "u2")).toBe(false);
    expect(canDeleteItem(me, "u2")).toBe(false);
    expect(canDeleteItem({ ...me, isOwner: true }, "u2")).toBe(true);
  });
  it("signers (no comment access) cannot edit or resolve", () => {
    const signer = { ...me, canComment: false };
    expect(canEditItem(signer, "u1")).toBe(false);
    expect(canResolve(signer, thread("a"))).toBe(false);
  });
  it("editors resolve any thread, viewers only their own", () => {
    expect(
      canResolve(me, thread("a", { author: { id: "u2", name: "Bo" } })),
    ).toBe(false);
    expect(canResolve(me, thread("a"))).toBe(true);
    expect(
      canResolve(
        { ...me, canEditDoc: true },
        thread("a", { author: { id: "u2", name: "Bo" } }),
      ),
    ).toBe(true);
  });
});

describe("parseRichText", () => {
  it("parses markdown, links and mentions", () => {
    expect(
      parseRichText(
        "Hi @[Ana Lee](ana@x.io), see **this** and *that* or _it_ `x()` [doc](https://a.b/c) https://e.f/g.",
      ),
    ).toEqual([
      { type: "text", text: "Hi " },
      { type: "mention", text: "Ana Lee", email: "ana@x.io" },
      { type: "text", text: ", see " },
      { type: "bold", text: "this" },
      { type: "text", text: " and " },
      { type: "italic", text: "that" },
      { type: "text", text: " or " },
      { type: "italic", text: "it" },
      { type: "text", text: " " },
      { type: "code", text: "x()" },
      { type: "text", text: " " },
      { type: "link", text: "doc", href: "https://a.b/c" },
      { type: "text", text: " " },
      { type: "link", text: "https://e.f/g", href: "https://e.f/g" },
      { type: "text", text: "." },
    ]);
  });
  it("never links unsafe schemes", () => {
    const tokens = parseRichText("[x](javascript:alert(1))");
    expect(tokens.every((t) => t.type !== "link")).toBe(true);
  });
  it("leaves snake_case and lone stars as text", () => {
    expect(parseRichText("a snake_case_name 2 * 3")).toEqual([
      { type: "text", text: "a snake_case_name 2 * 3" },
    ]);
  });
  it("keeps newlines in text", () => {
    expect(parseRichText("a\nb")).toEqual([{ type: "text", text: "a\nb" }]);
  });
});

describe("mentions", () => {
  const ana = { name: "Ana Lee", email: "ana@x.io" };
  const an = { name: "Ana", email: "an@x.io" };
  it("detects the query being typed", () => {
    expect(mentionQuery("hello @an")).toEqual({ query: "an", start: 6 });
    expect(mentionQuery("@")).toEqual({ query: "", start: 0 });
    expect(mentionQuery("mail me a@b")).toBeNull();
    expect(mentionQuery("@ana lee")).toBeNull();
  });
  it("matches people by name or email", () => {
    expect(matchPeople([ana, an], "lee")).toEqual([ana]);
    expect(matchPeople([ana, an], "AN@")).toEqual([an]);
  });
  it("encodes picked names, longest first, and round-trips", () => {
    const { content, mentions } = encodeMentions(
      "@Ana Lee and @Ana, not a@Ana",
      [an, ana],
    );
    expect(content).toBe("@[Ana Lee](ana@x.io) and @[Ana](an@x.io), not a@Ana");
    expect(mentions.sort()).toEqual(["an@x.io", "ana@x.io"]);
    const back = decodeMentions(content);
    expect(back.text).toBe("@Ana Lee and @Ana, not a@Ana");
    expect(back.picked).toEqual([ana, an]);
  });
  it("lists people with access, without me, deduped", () => {
    const people = mentionCandidates(
      [
        { email: "Bo@x.io", displayName: "Bo", status: "active" },
        { email: "me@x.io", status: "active" },
        { email: "pending@x.io", status: "pending" },
        { email: "cy@x.io", status: "active" },
      ],
      [
        { id: "u9", name: "Bo B", email: "bo@x.io" },
        { id: "me", name: "Me", email: "other@x.io" },
      ],
      { id: "me", email: "me@x.io" },
    );
    expect(people.map((p) => p.email)).toEqual(["bo@x.io", "cy@x.io"]);
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-06-15T12:00:00Z").getTime();
  it("formats recent times", () => {
    expect(relativeTime("2026-06-15T11:59:40Z", now)).toBe("just now");
    expect(relativeTime("2026-06-15T11:55:00Z", now)).toBe("5m ago");
    expect(relativeTime("2026-06-15T09:00:00Z", now)).toBe("3h ago");
    expect(relativeTime("2026-06-13T12:00:00Z", now)).toBe("2d ago");
    expect(relativeTime("bad", now)).toBe("");
  });
});
