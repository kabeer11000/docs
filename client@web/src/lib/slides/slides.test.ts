import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import {
  addElement,
  deleteSlide,
  duplicateSlide,
  elementField,
  field,
  insertSlide,
  insertSlides,
  isEmptyDeck,
  moveSlide,
  notesToHtml,
  patchElement,
  raiseElement,
  readStructure,
  removeElement,
  replaceDeck,
  seedDeck,
  setBackground,
  setLayout,
  setTheme,
  setTransition,
  updateElement,
} from "./deck-doc";
import { deckToHtml, NAV_KEYS, navigate } from "./export";
import { type Deck, normalizeDeck, normalizeElement, sameSlide } from "./model";

describe("normalizeDeck", () => {
  it.each([null, undefined, "x", 42, {}, { slides: [] }, { slides: "nope" }])(
    "turns %j into one title slide",
    (data) => {
      const deck = normalizeDeck(data);
      expect(deck).toMatchObject({
        version: 1,
        aspect: "16:9",
        theme: "paper",
        transition: "none",
      });
      expect(deck.slides).toHaveLength(1);
      expect(deck.slides[0]).toMatchObject({
        layout: "title",
        notes: "",
        html: {},
        elements: [],
      });
      expect(deck.slides[0].id).toMatch(/.{6,}/);
    },
  );

  it("keeps valid slides and repairs bad fields", () => {
    const deck = normalizeDeck({
      theme: "night",
      slides: [
        {
          id: "a",
          layout: "two-column",
          notes: "hi",
          html: { title: "<p>T</p>", left: 3 },
        },
        { id: "a", layout: "weird", html: null },
        null,
        "junk",
      ],
    });
    expect(deck.theme).toBe("night");
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[0]).toEqual({
      id: "a",
      layout: "two-column",
      notes: "hi",
      html: { title: "<p>T</p>" },
      elements: [],
    });
    expect(deck.slides[1].id).not.toBe("a");
    expect(deck.slides[1]).toMatchObject({
      layout: "title-body",
      notes: "",
      html: {},
    });
  });

  it("falls back to the paper theme", () => {
    expect(
      normalizeDeck({ theme: "neon", slides: [{ id: "x", layout: "blank" }] })
        .theme,
    ).toBe("paper");
  });
});

describe("deckToHtml", () => {
  const deck: Deck = {
    version: 1,
    aspect: "16:9",
    theme: "ink",
    transition: "none",
    slides: [
      {
        id: "1",
        layout: "title",
        notes: "",
        html: {
          title: "<p>Hello</p>",
          subtitle: "<p>World</p>",
          body: "<p>offlayout</p>",
        },
        elements: [],
      },
      { id: "2", layout: "blank", notes: "secret", html: {}, elements: [] },
    ],
  };

  it("is a standalone deck with navigation", () => {
    const html = deckToHtml(deck, 'Q3 <plan> & "goals"');
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain(
      "<title>Q3 &lt;plan&gt; &amp; &quot;goals&quot;</title>",
    );
    expect(html.match(/<section class="sl"/g)).toHaveLength(2);
    expect(html).toContain('data-theme="ink" data-layout="title"');
    expect(html).toContain(
      '<div class="sl-r" data-region="title"><div><p>Hello</p></div></div>',
    );
    expect(html).not.toContain("offlayout");
    expect(html).not.toContain("secret");
    expect(html).toContain("<script>");
    expect(html).toContain('"ArrowRight":"next"');
    expect(html).not.toMatch(/src=|href=/);
  });

  it("print mode lays one slide per 1280x720 page without script", () => {
    const html = deckToHtml(deck, "x", {
      print: true,
      extraCss: "@font-face{}",
    });
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
  const text = (doc: Y.Doc, id: string, region: string) =>
    doc.getXmlFragment(field(id, region)).toString();
  const seeded = () => {
    const doc = new Y.Doc();
    seedDeck(
      doc,
      normalizeDeck({
        theme: "night",
        transition: "zoom",
        slides: [
          {
            id: "a",
            layout: "title",
            notes: "line 1\nline <2>",
            html: { title: "A" },
            elements: [
              {
                id: "t1",
                type: "text",
                x: 10,
                y: 10,
                w: 30,
                h: 10,
                html: "TB",
              },
              {
                id: "s1",
                type: "shape",
                shape: "circle",
                x: 50,
                y: 50,
                w: 10,
                h: 10,
                color: "accent",
              },
            ],
          },
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
      transition: "zoom",
      slides: [
        {
          id: "a",
          layout: "title",
          elements: [
            { id: "t1", type: "text", x: 10, y: 10, w: 30, h: 10 },
            {
              id: "s1",
              type: "shape",
              shape: "circle",
              x: 50,
              y: 50,
              w: 10,
              h: 10,
              color: "accent",
            },
          ],
        },
        { id: "b", layout: "blank", elements: [] },
      ],
    });
    expect(text(seededDoc, "a", "title")).toContain("A");
    expect(text(seededDoc, "a", "notes")).toContain("line &lt;2&gt;");
    expect(seededDoc.getXmlFragment(elementField("t1")).toString()).toContain(
      "TB",
    );
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
    const copied = readStructure(doc).slides[1].elements;
    expect(copied.map((e) => e.type)).toEqual(["text", "shape"]);
    expect(copied[0].id).not.toBe("t1");
    expect(doc.getXmlFragment(elementField(copied[0].id)).toString()).toContain(
      "TB",
    );
    moveSlide(doc, "b", 0);
    expect(ids()).toEqual(["b", "a", copy, n]);
    expect(deleteSlide(doc, "a")).toBe(true);
    expect(ids()).toEqual(["b", copy, n]);
    expect(text(doc, "a", "title")).toBe("");
    expect(doc.getXmlFragment(elementField("t1")).length).toBe(0);
    expect(readStructure(doc).slides[1].elements).toHaveLength(2);
    setLayout(doc, n, "image");
    setTheme(doc, "ink");
    setTransition(doc, "fade");
    expect(readStructure(doc).slides[2].layout).toBe("image");
    expect(readStructure(doc).theme).toBe("ink");
    expect(readStructure(doc).transition).toBe("fade");
  });

  it("adds, moves, raises and removes elements", () => {
    const doc = seeded();
    const els = () =>
      readStructure(doc).slides.find((s) => s.id === "b")?.elements ?? [];
    const one = addElement(doc, "b", {
      type: "shape",
      shape: "rect",
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      color: "fg",
    });
    const two = addElement(doc, "b", {
      type: "icon",
      icon: "star",
      x: 5,
      y: 5,
      w: 5,
      h: 9,
    });
    expect(els().map((e) => e.id)).toEqual([one, two]);
    raiseElement(doc, one);
    expect(els().map((e) => e.id)).toEqual([two, one]);
    updateElement(doc, one, { x: 20, y: 30, w: 40, h: 50 });
    expect(els()[1]).toMatchObject({ x: 20, y: 30, w: 40, h: 50, color: "fg" });
    patchElement(doc, one, { color: "#112233", rotation: 45 });
    expect(els()[1]).toMatchObject({ color: "#112233", rotation: 45 });
    removeElement(doc, one);
    expect(els().map((e) => e.id)).toEqual([two]);
    updateElement(doc, "missing", { x: 1, y: 1, w: 1, h: 1 });
    expect(els()).toHaveLength(1);
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

describe("normalizeElement", () => {
  it("keeps valid elements of every type and drops unsafe ones", () => {
    expect(
      normalizeElement({
        id: "i",
        type: "image",
        x: 1,
        y: 2,
        w: 3,
        h: 4,
        src: "javascript:alert(1)",
      }),
    ).toBeNull();
    expect(
      normalizeElement({
        id: "i",
        type: "image",
        x: 1,
        y: 2,
        w: 3,
        h: 4,
        src: "data:image/png;base64,AA",
      }),
    ).toEqual({
      id: "i",
      type: "image",
      x: 1,
      y: 2,
      w: 3,
      h: 4,
      src: "data:image/png;base64,AA",
    });
    expect(normalizeElement({ type: "shape", shape: "hexagon" })).toBeNull();
    expect(
      normalizeElement({
        id: "s",
        type: "shape",
        shape: "star",
        x: 0,
        y: 0,
        w: 10,
        h: 10,
        color: "red;}",
      }),
    ).toMatchObject({
      color: "accent",
    });
    expect(
      normalizeElement({
        id: "c",
        type: "icon",
        icon: "../x",
        x: 0,
        y: 0,
        w: 1,
        h: 1,
      }),
    ).toBeNull();
    expect(
      normalizeElement({
        id: "ch",
        type: "chart",
        x: 0,
        y: 0,
        w: 40,
        h: 40,
        chart: { kind: "pie", labels: ["a", "b"], values: ["3", "x"] },
      }),
    ).toMatchObject({
      chart: { kind: "pie", labels: ["a", "b"], values: [3, 0] },
    });
    expect(
      normalizeElement({
        id: "t",
        type: "text",
        x: 0,
        y: 0,
        w: 10,
        h: 10,
        rotation: 360,
        opacity: 1,
        locked: false,
      }),
    ).toEqual({
      id: "t",
      type: "text",
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      html: "",
    });
    expect(
      normalizeElement({
        id: "t",
        type: "text",
        x: 500,
        y: -500,
        w: 10,
        h: 10,
      }),
    ).toMatchObject({ x: 99, y: -9 });
  });

  it("migrates decks without elements and keeps valid backgrounds", () => {
    const deck = normalizeDeck({
      slides: [
        { id: "a", layout: "quote", background: "grad-sunset" },
        { id: "b", background: "url(x)" },
      ],
    });
    expect(deck.slides[0]).toMatchObject({
      layout: "quote",
      elements: [],
      background: "grad-sunset",
    });
    expect(deck.slides[1].background).toBeUndefined();
  });
});

describe("template insertion", () => {
  const fill = (html: string, frag: Y.XmlFragment) => {
    const p = new Y.XmlElement("paragraph");
    p.insert(0, [new Y.XmlText(html)]);
    frag.insert(frag.length, [p]);
  };
  const tpl = normalizeDeck({
    theme: "lemon",
    transition: "slide",
    slides: [
      {
        id: "t1",
        layout: "big-number",
        background: "grad-mint",
        html: { stat: "9" },
        elements: [
          { id: "e1", type: "text", x: 1, y: 1, w: 9, h: 9, html: "Hi" },
        ],
      },
      { id: "t2", layout: "quote", html: { quote: "Q" } },
    ],
  });

  it("inserts slides with content, backgrounds and elements at an index", () => {
    const doc = new Y.Doc();
    seedDeck(doc, normalizeDeck({ slides: [{ id: "a" }, { id: "b" }] }), fill);
    insertSlides(doc, tpl.slides, 1, fill);
    const s = readStructure(doc);
    expect(s.slides.map((x) => x.id)).toEqual(["a", "t1", "t2", "b"]);
    expect(s.slides[1]).toMatchObject({
      layout: "big-number",
      background: "grad-mint",
      elements: [{ id: "e1", type: "text" }],
    });
    expect(doc.getXmlFragment(field("t1", "stat")).toString()).toContain("9");
    expect(doc.getXmlFragment(elementField("e1")).toString()).toContain("Hi");
    expect(s.theme).toBe("paper");
  });

  it("replaces the whole deck and takes the template's theme", () => {
    const doc = new Y.Doc();
    seedDeck(
      doc,
      normalizeDeck({ slides: [{ id: "a", html: { title: "old" } }] }),
      fill,
    );
    replaceDeck(doc, tpl, fill);
    const s = readStructure(doc);
    expect(s.slides.map((x) => x.id)).toEqual(["t1", "t2"]);
    expect(s).toMatchObject({ theme: "lemon", transition: "slide" });
    expect(doc.getXmlFragment(field("a", "title")).length).toBe(0);
  });

  it("keeps and clears per-slide backgrounds without losing the layout", () => {
    const doc = new Y.Doc();
    seedDeck(
      doc,
      normalizeDeck({ slides: [{ id: "a", layout: "quote" }] }),
      fill,
    );
    setBackground(doc, "a", "#112233");
    setLayout(doc, "a", "agenda");
    expect(readStructure(doc).slides[0]).toMatchObject({
      layout: "agenda",
      background: "#112233",
    });
    setBackground(doc, "a", undefined);
    expect(readStructure(doc).slides[0].background).toBeUndefined();
    expect(readStructure(doc).slides[0].layout).toBe("agenda");
  });

  it("compares slides deeply", () => {
    const a = tpl.slides[0];
    expect(sameSlide(a, structuredClone(a))).toBe(true);
    expect(sameSlide(a, { ...a, elements: [{ ...a.elements[0], x: 2 }] })).toBe(
      false,
    );
  });
});
