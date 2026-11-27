import type { Node as PMNode } from "@tiptap/pm/model";
import { schema } from "@tiptap/pm/schema-basic";
import { describe, expect, it } from "vitest";
import { findMatches } from "./find-matches";

const p = (...content: PMNode[]) => schema.node("paragraph", null, content);
const t = (text: string, bold = false) => schema.text(text, bold ? [schema.marks.strong.create()] : []);
const doc = (...blocks: ReturnType<typeof p>[]) => schema.node("doc", null, blocks);
const opts = { caseSensitive: false, wholeWord: false };

const texts = (d: ReturnType<typeof doc>, q: string, o = opts) =>
  findMatches(d, q, o).map(({ from, to }) => d.textBetween(from, to));

describe("findMatches", () => {
  it("returns nothing for an empty query", () => {
    expect(findMatches(doc(p(t("abc"))), "", opts)).toEqual([]);
  });

  it("maps positions back into the document", () => {
    const d = doc(p(t("one two")), p(t("two")));
    expect(findMatches(d, "two", opts)).toEqual([
      { from: 5, to: 8 },
      { from: 10, to: 13 },
    ]);
  });

  it("ignores case unless asked", () => {
    const d = doc(p(t("Cat cat CAT")));
    expect(texts(d, "cat")).toEqual(["Cat", "cat", "CAT"]);
    expect(texts(d, "cat", { ...opts, caseSensitive: true })).toEqual(["cat"]);
  });

  it("respects whole words, including unicode letters", () => {
    const d = doc(p(t("art part art_x café art")));
    expect(texts(d, "art", { ...opts, wholeWord: true })).toHaveLength(2);
    expect(texts(doc(p(t("cafés café"))), "café", { ...opts, wholeWord: true })).toEqual(["café"]);
  });

  it("treats the query literally", () => {
    expect(texts(doc(p(t("a.b axb (x)"))), "a.b")).toEqual(["a.b"]);
    expect(texts(doc(p(t("a.b axb (x)"))), "(x)")).toEqual(["(x)"]);
  });

  it("matches across marks but not across inline nodes or blocks", () => {
    const d = doc(p(t("hel"), t("lo", true)), p(t("ab"), schema.node("hard_break"), t("cd")));
    expect(texts(d, "hello")).toEqual(["hello"]);
    expect(findMatches(d, "bc", opts)).toEqual([]);
    const [cd] = findMatches(d, "cd", opts);
    expect(d.textBetween(cd.from, cd.to)).toBe("cd");
  });

  it("finds text in nested blocks", () => {
    const d = schema.node("doc", null, [schema.node("blockquote", null, [p(t("deep needle"))])]);
    expect(texts(d, "needle")).toEqual(["needle"]);
  });
});
