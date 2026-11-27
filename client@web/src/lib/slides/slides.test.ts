import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import {
  deleteSlide,
  duplicateSlide,
  field,
  insertSlide,
  isEmptyDeck,
  moveSlide,
  notesToHtml,
  readStructure,
  seedDeck,
  setLayout,
  setTheme,
} from "./deck-doc";
import { deckToHtml, NAV_KEYS, navigate } from "./export";
import { type Deck, normalizeDeck } from "./model";

describe("normalizeDeck", () => {
  it.each([null, undefined, "x", 42, {}, { slides: [] }, { slides: "nope" }])("turns %j into one title slide", (data) => {
    const deck = normalizeDeck(data);
    expect(deck).toMatchObject({ version: 1, aspect: "16:9", theme: "paper" });
    expect(deck.slides).toHaveLength(1);
    expect(deck.slides[0]).toMatchObject({ layout: "title", notes: "", html: {} });
    expect(deck.slides[0].id).toMatch(/.{6,}/);
  });

  it("keeps valid slides and repairs bad fields", () => {
    const deck = normalizeDeck({
      theme: "night",
      slides: [
        { id: "a", layout: "two-column", notes: "hi", html: { title: "<p>T</p>", left: 3 } },
        { id: "a", layout: "weird", html: null },
        null,
        "junk",
      ],
    });
    expect(deck.theme).toBe("night");
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[0]).toEqual({ id: "a", layout: "two-column", notes: "hi", html: { title: "<p>T</p>" } });
    expect(deck.slides[1].id).not.toBe("a");
    expect(deck.slides[1]).toMatchObject({ layout: "title-body", notes: "", html: {} });
  });

  it("falls back to the paper theme", () => {
    expect(normalizeDeck({ theme: "neon", slides: [{ id: "x", layout: "blank" }] }).theme).toBe("paper");
  });
});

describe("deckToHtml", () => {
  const deck: Deck = {
    version: 1,
    aspect: "16:9",
    theme: "ink",
    slides: [
      { id: "1", layout: "title", notes: "", html: { title: "<p>Hello</p>", subtitle: "<p>World</p>", body: "<p>offlayout</p>" } },
      { id: "2", layout: "blank", notes: "secret", html: {} },
    ],
  };

  it("is a standalone deck with navigation", () => {
    const html = deckToHtml(deck, 'Q3 <plan> & "goals"');
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<title>Q3 &lt;plan&gt; &amp; &quot;goals&quot;</title>");
    expect(html.match(/<section class="sl"/g)).toHaveLength(2);
    expect(html).toContain('data-theme="ink" data-layout="title"');
    expect(html).toContain('<div class="sl-r" data-region="title"><div><p>Hello</p></div></div>');
    expect(html).not.toContain("offlayout");
    expect(html).not.toContain("secret");
    expect(html).toContain("<script>");
    expect(html).toContain('"ArrowRight":"next"');
    expect(html).not.toMatch(/src=|href=/);
  });

  it("print mode lays one slide per 1280x720 page without script", () => {
    const html = deckToHtml(deck, "x", { print: true, extraCss: "@font-face{}" });
    expect(html).toContain("@page{size:1280px 720px;margin:0}");
    expect(html).toContain("@font-face{}");
    expect(html).not.toContain("<script>");
  });

  it("names an untitled deck", () => {
    expect(deckToHtml(deck, "")).toContain("<title>Presentation</title>");
  });
});

describe("navigate", () => {
  it("clamps to the deck", () => {
    expect(navigate("next", 0, 3)).toBe(1);
    expect(navigate("next", 2, 3)).toBe(2);
    expect(navigate("prev", 0, 3)).toBe(0);
    expect(navigate("first", 2, 3)).toBe(0);
    expect(navigate("last", 0, 3)).toBe(2);
    expect(NAV_KEYS.PageDown).toBe("next");
    expect(NAV_KEYS.Home).toBe("first");
  });
});

describe("deck doc", () => {
  const fill = (html: string, frag: Y.XmlFragment) => {
    const p = new Y.XmlElement("paragraph");
    p.insert(0, [new Y.XmlText(html)]);
    frag.insert(frag.length, [p]);
  };
  const text = (doc: Y.Doc, id: string, region: string) => doc.getXmlFragment(field(id, region)).toString();
  const seeded = () => {
    const doc = new Y.Doc();
    seedDeck(
      doc,
      normalizeDeck({
        theme: "night",
        slides: [
          { id: "a", layout: "title", notes: "line 1\nline <2>", html: { title: "A" } },
          { id: "b", layout: "blank", html: { body: "B" } },
        ],
      }),
      fill,
    );
    return doc;
  };

  it("seeds an empty doc once", () => {
    const doc = new Y.Doc();
    expect(isEmptyDeck(doc)).toBe(true);
    const seededDoc = seeded();
    expect(isEmptyDeck(seededDoc)).toBe(false);
    expect(readStructure(seededDoc)).toEqual({
      theme: "night",
      slides: [
        { id: "a", layout: "title" },
        { id: "b", layout: "blank" },
      ],
    });
    expect(text(seededDoc, "a", "title")).toContain("A");
    expect(text(seededDoc, "a", "notes")).toContain("line &lt;2&gt;");
  });

  it("inserts, duplicates, moves and deletes", () => {
    const doc = seeded();
    const ids = () => readStructure(doc).slides.map((s) => s.id);
    const n = insertSlide(doc, 1, "section");
    expect(ids()).toEqual(["a", n, "b"]);
    const copy = duplicateSlide(doc, "a") as string;
    expect(ids()).toEqual(["a", copy, n, "b"]);
    expect(readStructure(doc).slides[1].layout).toBe("title");
    expect(text(doc, copy, "title")).toBe(text(doc, "a", "title"));
    expect(text(doc, copy, "notes")).toBe(text(doc, "a", "notes"));
    moveSlide(doc, "b", 0);
    expect(ids()).toEqual(["b", "a", copy, n]);
    expect(deleteSlide(doc, "a")).toBe(true);
    expect(ids()).toEqual(["b", copy, n]);
    expect(text(doc, "a", "title")).toBe("");
    setLayout(doc, n, "image");
    setTheme(doc, "ink");
    expect(readStructure(doc).slides[2].layout).toBe("image");
    expect(readStructure(doc).theme).toBe("ink");
  });

  it("never deletes the last slide", () => {
    const doc = new Y.Doc();
    const id = insertSlide(doc, 0, "title");
    expect(deleteSlide(doc, id)).toBe(false);
    expect(readStructure(doc).slides).toHaveLength(1);
  });

  it("drops duplicate ids from a double seed", () => {
    const doc = seeded();
    doc.getArray<string>("order").push(["a"]);
    expect(readStructure(doc).slides.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("escapes notes", () => {
    expect(notesToHtml("a\n<b>")).toBe("<p>a</p><p>&lt;b&gt;</p>");
  });
});
