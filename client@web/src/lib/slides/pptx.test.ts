import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { describe, expect, it } from "vitest";
import {
  backgroundCss,
  chartSvg,
  elementMarkup,
  iconSvg,
  paintCss,
  paintHex,
  shapeSvg,
} from "./elements";
import { deckToHtml } from "./export";
import {
  alignBoxes,
  boundsOf,
  distributeBoxes,
  imageBox,
  keepOnSlide,
  resizeBox,
  snapMove,
} from "./geometry";
import { type Deck, normalizeDeck, type SlideElement, THEMES } from "./model";
import {
  buildPptx,
  containBox,
  cssColor,
  decodeEntities,
  htmlToParas,
  mix,
  parasToRuns,
  slideToSpec,
} from "./pptx";

const theme = THEMES.paper;

describe("htmlToParas", () => {
  it("reads paragraphs, marks, colours, alignment and lists", () => {
    const { paras, images } = htmlToParas(
      '<p style="text-align: center">Hi <strong>bold <em>both</em></strong> &amp; <span style="color: #ff0000">red</span></p>' +
        "<ul><li><p>one</p></li><li><p><u>two</u></p></li></ul><ol><li><p>first</p></li></ol>" +
        '<p><a href="https://x.dev">link</a><span style="color: var(--sl-accent)">acc</span></p><p><img src="data:image/png;base64,AA"></p>',
      theme,
    );
    expect(paras[0]).toEqual({
      align: "center",
      runs: [
        { text: "Hi " },
        { text: "bold ", bold: true },
        { text: "both", bold: true, italic: true },
        { text: " & " },
        { text: "red", color: "FF0000" },
      ],
    });
    expect(paras[1]).toEqual({ bullet: "bullet", runs: [{ text: "one" }] });
    expect(paras[2]).toEqual({
      bullet: "bullet",
      runs: [{ text: "two", underline: true }],
    });
    expect(paras[3]).toEqual({ bullet: "number", runs: [{ text: "first" }] });
    expect(paras[4].runs).toEqual([
      { text: "link", link: "https://x.dev" },
      { text: "acc", color: "FF6A1F" },
    ]);
    expect(images).toEqual(["data:image/png;base64,AA"]);
  });

  it("ignores unsafe links and image sources", () => {
    const { paras, images } = htmlToParas(
      '<p><a href="javascript:x">a</a><img src="javascript:y"></p>',
      theme,
    );
    expect(paras[0].runs).toEqual([{ text: "a" }]);
    expect(images).toEqual([]);
  });

  it("decodes entities and colours", () => {
    expect(
      decodeEntities("&lt;a&gt; &#65;&#x42; &nbsp;&unknown;").replace(
        /\u00a0/g,
        "_",
      ),
    ).toBe("<a> AB _&unknown;");
    expect(cssColor("#abc", theme)).toBe("AABBCC");
    expect(cssColor("rgb(255, 0, 16)", theme)).toBe("FF0010");
    expect(cssColor("color-mix(in srgb, red, blue)", theme)).toBeUndefined();
    expect(mix("FFFFFF", "000000", 0.5)).toBe("808080");
  });
});

describe("parasToRuns", () => {
  it("repeats paragraph options and breaks lines between paragraphs", () => {
    const runs = parasToRuns([
      { runs: [{ text: "a", bold: true }, { text: "b" }], bullet: "bullet" },
      { runs: [], align: "right" },
      { runs: [{ text: "c" }], bullet: "number" },
    ]);
    expect(runs).toEqual([
      { text: "a", options: { bold: true, bullet: true } },
      { text: "b", options: { bullet: true, breakLine: true } },
      { text: "", options: { align: "right", breakLine: true } },
      { text: "c", options: { bullet: { type: "number" } } },
    ]);
  });
});

describe("slideToSpec", () => {
  const deck = normalizeDeck({
    theme: "night",
    slides: [
      {
        id: "s",
        layout: "big-number",
        notes: "say this",
        background: "#123456",
        html: {
          stat: "<p>42%</p>",
          caption: "<p>growth</p>",
          title: "<p>hidden by layout</p>",
        },
        elements: [
          {
            id: "t",
            type: "text",
            x: 50,
            y: 50,
            w: 25,
            h: 10,
            html: "<p>box</p>",
            size: 40,
            color: "#00FF00",
            font: "serif",
            rotation: 10,
          },
          {
            id: "i",
            type: "image",
            x: 0,
            y: 0,
            w: 10,
            h: 10,
            src: "data:image/png;base64,AA",
            opacity: 0.5,
          },
          { id: "e", type: "text", x: 0, y: 0, w: 10, h: 10, html: "<p></p>" },
          {
            id: "sh",
            type: "shape",
            shape: "rounded",
            x: 0,
            y: 0,
            w: 50,
            h: 50,
            color: "accent",
            stroke: "fg",
          },
          {
            id: "ln",
            type: "shape",
            shape: "line",
            x: 0,
            y: 50,
            w: 100,
            h: 2,
            color: "fg",
          },
          { id: "ic", type: "icon", icon: "star", x: 0, y: 0, w: 5, h: 5 },
          {
            id: "ch",
            type: "chart",
            x: 0,
            y: 0,
            w: 50,
            h: 50,
            chart: { kind: "bar", labels: ["Q1", "Q2"], values: [1, 2] },
          },
        ],
      },
      {
        id: "a",
        layout: "agenda",
        html: { title: "<p>Plan</p>", body: "<p>One</p><p>Two</p>" },
      },
    ],
  });

  it("maps regions, elements, background and notes", () => {
    const spec = slideToSpec(deck.slides[0], deck.theme);
    expect(spec.background).toBe("123456");
    expect(spec.notes).toBe("say this");
    const [stat, caption, text, image, shape, line, icon, chart] = spec.items;
    expect(spec.items).toHaveLength(8);
    expect(stat).toMatchObject({
      kind: "text",
      color: "FF9257",
      fontSize: 157.5,
      bold: true,
      valign: "bottom",
      box: { x: 1, y: 1 },
    });
    expect(caption).toMatchObject({
      kind: "text",
      color: "F1F3F7",
      fontSize: 25.5,
    });
    expect(text).toMatchObject({
      kind: "text",
      color: "00FF00",
      fontSize: 30,
      fontFace: "Georgia",
      rotate: 10,
      box: { x: 6.667, y: 3.75, w: 3.333, h: 0.75 },
    });
    expect(image).toMatchObject({
      kind: "image",
      transparency: 50,
      box: { x: 0, y: 0 },
    });
    expect(shape).toMatchObject({
      kind: "shape",
      shape: "roundRect",
      fill: "FF9257",
      line: { color: "F1F3F7", width: 3 },
    });
    expect(line).toMatchObject({
      kind: "shape",
      shape: "line",
      fill: null,
      line: { color: "F1F3F7", width: 4.5 },
      box: { h: 0 },
    });
    expect(icon).toMatchObject({ kind: "image" });
    expect(
      (icon as { src: string }).src.startsWith("data:image/svg+xml;base64,"),
    ).toBe(true);
    expect(atob((icon as { src: string }).src.split(",")[1])).toContain(
      'stroke="#FF9257"',
    );
    expect(chart).toMatchObject({
      kind: "chart",
      chart: "bar",
      labels: ["Q1", "Q2"],
      values: [1, 2],
    });
  });

  it("numbers agenda lines", () => {
    const spec = slideToSpec(deck.slides[1], deck.theme);
    expect(spec.items[1]).toMatchObject({
      kind: "text",
      paras: [{ bullet: "number" }, { bullet: "number" }],
    });
  });

  it("fits images inside their box", () => {
    expect(containBox({ x: 0, y: 0, w: 4, h: 2 }, { w: 100, h: 100 })).toEqual({
      x: 1,
      y: 0,
      w: 2,
      h: 2,
    });
    expect(containBox({ x: 0, y: 0, w: 4, h: 2 }, null)).toEqual({
      x: 0,
      y: 0,
      w: 4,
      h: 2,
    });
  });
});

describe("buildPptx", () => {
  it("writes a real presentation with text, notes, shapes, charts and backgrounds", async () => {
    const deck: Deck = normalizeDeck({
      theme: "tangerine",
      slides: [
        {
          id: "1",
          layout: "title",
          notes: "Opening line",
          html: {
            title: "<p>Launch <strong>day</strong></p>",
            subtitle: "<p>Q3 plan</p>",
          },
          elements: [
            {
              id: "s",
              type: "shape",
              shape: "circle",
              x: 80,
              y: 10,
              w: 10,
              h: 17,
              color: "#FFFFFF",
            },
            {
              id: "c",
              type: "chart",
              x: 10,
              y: 10,
              w: 40,
              h: 40,
              chart: { kind: "pie", labels: ["A", "B"], values: [2, 3] },
            },
          ],
        },
        {
          id: "2",
          layout: "title-body",
          background: "grad-ocean",
          html: {
            title: "<p>Next</p>",
            body: "<ul><li><p>Point</p></li></ul>",
          },
        },
      ],
    });
    const pptx = await buildPptx(deck, "Deck", PptxGenJS);
    const buf = (await pptx.write({
      outputType: "arraybuffer",
    })) as ArrayBuffer;
    const zip = await JSZip.loadAsync(buf);
    const slide1 = await zip.file("ppt/slides/slide1.xml")?.async("string");
    const slide2 = await zip.file("ppt/slides/slide2.xml")?.async("string");
    expect(slide1).toContain("Launch ");
    expect(slide1).toContain('b="1"');
    expect(slide1).toContain("FF6A1F");
    expect(slide1).toContain('prst="ellipse"');
    expect(slide2).toContain("<a:buChar");
    expect(slide2).toContain("2F4BD0");
    expect(
      Object.keys(zip.files).some((f) => f.startsWith("ppt/charts/chart")),
    ).toBe(true);
    const notes = await Promise.all(
      Object.keys(zip.files)
        .filter((f) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(f))
        .map((f) => zip.file(f)?.async("string")),
    );
    expect(notes.join("")).toContain("Opening line");
  });
});

describe("element markup", () => {
  const base = { id: "e", x: 10, y: 20, w: 30, h: 40 };

  it("draws every shape, icon and chart as SVG", () => {
    for (const shape of [
      "rect",
      "rounded",
      "circle",
      "triangle",
      "line",
      "arrow",
      "star",
      "bubble",
    ] as const) {
      expect(
        shapeSvg({ ...base, type: "shape", shape, color: "accent" }),
      ).toMatch(/^<svg [^>]+>.*<(rect|ellipse|polygon|line|path) /);
    }
    expect(iconSvg("star")).toContain("<path");
    expect(iconSvg("nope")).toBe(
      iconSvg("nope").replace(/<(path|circle|polygon)/g, ""),
    );
    for (const kind of ["bar", "line", "pie"] as const) {
      const svg = chartSvg(
        { kind, labels: ["A<b>", "B"], values: [3, -1] },
        400,
        300,
      );
      expect(svg).toContain("A&lt;b&gt;");
      expect(svg).not.toContain("NaN");
    }
    expect(
      chartSvg({ kind: "pie", labels: ["only"], values: [5] }, 400, 300),
    ).toContain("<circle");
  });

  it("positions, rotates and styles elements", () => {
    const text: SlideElement = {
      ...base,
      type: "text",
      html: "<p>Hi</p>",
      font: "title",
      size: 60,
      color: "#FF0000",
      rotation: 15,
      opacity: 0.4,
    };
    const html = elementMarkup(text);
    expect(html).toContain(
      "left:10%;top:20%;width:30%;height:40%;transform:rotate(15deg);opacity:0.4",
    );
    expect(html).toContain("font-family:var(--sl-title-font)");
    expect(html).toContain("font-size:60px");
    expect(html).toContain("<p>Hi</p>");
    expect(
      elementMarkup({
        ...base,
        type: "image",
        src: 'https://x.dev/a.png?"onerror',
      }),
    ).toContain("&quot;onerror");
  });

  it("resolves paints and backgrounds", () => {
    expect(paintCss("accent")).toBe("var(--sl-accent)");
    expect(paintCss("red;}")).toBe("var(--sl-fg)");
    expect(paintHex("none", theme)).toBeNull();
    expect(paintHex("#11223344", theme)).toBe("112233");
    expect(backgroundCss("grad-sunset")).toContain("linear-gradient");
    expect(backgroundCss("#abcdef")).toBe("#abcdef");
    expect(backgroundCss("url(x)")).toBeUndefined();
  });

  it("renders elements and backgrounds into the exported deck", () => {
    const deck = normalizeDeck({
      slides: [
        {
          id: "a",
          layout: "blank",
          background: "pat-dots",
          elements: [
            { id: "s", type: "shape", shape: "star", x: 1, y: 1, w: 9, h: 9 },
          ],
        },
      ],
    });
    const html = deckToHtml(deck, "x");
    expect(html).toContain('class="sl-el sl-el-shape"');
    expect(html).toContain('style="background:radial-gradient');
  });
});

describe("geometry", () => {
  it("snaps edges and centres to the slide and other elements", () => {
    expect(snapMove({ x: 0.5, y: 33, w: 20, h: 20 }, [])).toMatchObject({
      x: 0,
      y: 33,
      guides: { v: [0], h: [] },
    });
    expect(snapMove({ x: 39.6, y: 39.5, w: 20, h: 20 }, [])).toMatchObject({
      x: 40,
      y: 40,
      guides: { v: [50], h: [50] },
    });
    expect(
      snapMove({ x: 20, y: 10, w: 10, h: 10 }, [
        { x: 30.4, y: 70, w: 5, h: 5 },
      ]),
    ).toMatchObject({ x: 20.4, guides: { v: [30.4] } });
    expect(snapMove({ x: 20, y: 20, w: 10, h: 10 }, [])).toMatchObject({
      x: 20,
      y: 20,
      guides: { v: [], h: [] },
    });
  });

  it("resizes from any corner with a minimum size", () => {
    const b = { x: 10, y: 10, w: 20, h: 20 };
    expect(resizeBox(b, "se", 5, 5)).toEqual({ x: 10, y: 10, w: 25, h: 25 });
    expect(resizeBox(b, "nw", 5, 5)).toEqual({ x: 15, y: 15, w: 15, h: 15 });
    expect(resizeBox(b, "ne", 50, -5)).toEqual({ x: 10, y: 5, w: 70, h: 25 });
    expect(resizeBox(b, "sw", 30, -30)).toEqual({ x: 28, y: 10, w: 2, h: 2 });
  });

  it("keeps a sliver on the slide and sizes images by aspect", () => {
    expect(keepOnSlide({ x: 150, y: -80, w: 20, h: 20 })).toEqual({
      x: 96,
      y: -16,
      w: 20,
      h: 20,
    });
    expect(imageBox(1600, 900)).toEqual({ x: 30, y: 30, w: 40, h: 40 });
    expect(imageBox(100, 1000).h).toBe(80);
  });
});

describe("align and distribute", () => {
  const boxes = [
    { x: 10, y: 10, w: 10, h: 10 },
    { x: 40, y: 30, w: 20, h: 10 },
    { x: 80, y: 50, w: 10, h: 30 },
  ];
  it("aligns to shared bounds, or to the slide for one box", () => {
    expect(alignBoxes(boxes, "left").map((b) => b.x)).toEqual([10, 10, 10]);
    expect(alignBoxes(boxes, "right").map((b) => b.x)).toEqual([80, 70, 80]);
    expect(alignBoxes(boxes, "middle").map((b) => b.y)).toEqual([40, 40, 30]);
    expect(alignBoxes([boxes[0]], "center")[0].x).toBe(45);
    expect(boundsOf(boxes)).toEqual({ x: 10, y: 10, w: 80, h: 70 });
  });
  it("distributes evenly and ignores fewer than three", () => {
    expect(distributeBoxes(boxes, "x").map((b) => b.x)).toEqual([10, 40, 80]);
    expect(distributeBoxes(boxes.slice(0, 2), "x")).toEqual(boxes.slice(0, 2));
  });
});
