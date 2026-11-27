import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import {
  CommentMark,
  quoteOf,
  resolveAnchors,
} from "../extensions/comment-extension";
import type { Thread } from "./threads";

const schema = getSchema([StarterKit, CommentMark]);
const mark = (id: string) => ({ type: "comment", attrs: { commentId: id } });
// <p>Hello <span data-comment-id="m">brave</span> new world</p><p>Second line</p>
const doc = schema.nodeFromJSON({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Hello " },
        { type: "text", text: "brave", marks: [mark("m")] },
        { type: "text", text: " new world" },
      ],
    },
    { type: "paragraph", content: [{ type: "text", text: "Second line" }] },
  ],
});
const thread = (
  id: string,
  range: { from: number; to: number },
  quote?: string,
) => ({ id, range, quote, resolved: false, replies: [] }) as unknown as Thread;

describe("resolveAnchors", () => {
  it("uses the comment mark wherever the text moved", () => {
    const a = resolveAnchors(doc, [thread("m", { from: 90, to: 95 }, "brave")]);
    expect(a.get("m")).toEqual({ from: 7, to: 12 });
    expect(quoteOf(doc, 7, 12)).toBe("brave");
  });

  it("falls back to the quote when the mark is gone, nearest to the old range", () => {
    const a = resolveAnchors(doc, [thread("q", { from: 1, to: 3 }, "Second")]);
    const r = a.get("q");
    expect(r && quoteOf(doc, r.from, r.to)).toBe("Second");
  });

  it("keeps a stored range whose text still matches", () => {
    expect(
      resolveAnchors(doc, [thread("s", { from: 1, to: 6 }, "Hello")]).get("s"),
    ).toEqual({ from: 1, to: 6 });
  });

  it("detaches threads whose text was deleted, keeps legacy ranges in bounds", () => {
    const a = resolveAnchors(doc, [
      thread("gone", { from: 1, to: 4 }, "deleted words"),
      thread("legacy", { from: 2, to: 4 }),
      thread("legacy-out", { from: 2, to: 999 }),
    ]);
    expect(a.has("gone")).toBe(false);
    expect(a.get("legacy")).toEqual({ from: 2, to: 4 });
    expect(a.has("legacy-out")).toBe(false);
  });
});
