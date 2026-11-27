import { degrees, PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  arrowHead,
  bounds,
  hitTest,
  mergeLineRects,
  resize,
  translate,
} from "./annotations";
import { appendPdf, ellipsePath, exportPdf, winAnsi } from "./export";
import {
  boxSize,
  type Frame,
  layerTransform,
  normRotation,
  pageToScreen,
  screenRectToPage,
  screenToPage,
  stepZoom,
  toUser,
} from "./geometry";
import { commit, historyOf, preview, redo, undo } from "./history";
import {
  type Annotation,
  initialData,
  isPdfBytes,
  type PdfData,
  parsePdfData,
  type Rotation,
} from "./model";
import { applyPageOp } from "./pages";
import { findMatches } from "./search";

const ROTATIONS: Rotation[] = [0, 90, 180, 270];

describe("geometry", () => {
  it("round-trips page and screen points at every rotation and zoom", () => {
    for (const rotation of ROTATIONS)
      for (const zoom of [0.5, 1, 2.25]) {
        const f: Frame = { w: 612, h: 792, zoom, rotation };
        for (const p of [
          [0, 0],
          [612, 792],
          [100, 700],
          [306.5, 12],
        ] as [number, number][]) {
          const back = screenToPage(f, pageToScreen(f, p));
          expect(back[0]).toBeCloseTo(p[0]);
          expect(back[1]).toBeCloseTo(p[1]);
        }
      }
  });

  it("puts the page's top-left corner where a clockwise rotation sends it", () => {
    const f = (rotation: Rotation): Frame => ({
      w: 100,
      h: 200,
      zoom: 2,
      rotation,
    });
    expect(pageToScreen(f(0), [0, 0])).toEqual([0, 0]);
    expect(pageToScreen(f(90), [0, 0])).toEqual([400, 0]); // top-right of a 400x200 box
    expect(pageToScreen(f(180), [0, 0])).toEqual([200, 400]);
    expect(pageToScreen(f(270), [0, 0])).toEqual([0, 200]); // bottom-left of a 400x200 box
    expect(boxSize(f(90))).toEqual({ width: 400, height: 200 });
  });

  it("agrees with the CSS layer transform", () => {
    for (const rotation of ROTATIONS) {
      const f: Frame = { w: 100, h: 200, zoom: 1.5, rotation };
      const m = layerTransform(f);
      const [a, b, c, d, e, g] =
        m === "none"
          ? [1, 0, 0, 1, 0, 0]
          : m.slice(7, -1).split(",").map(Number);
      const p: [number, number] = [30, 50];
      const x = p[0] * f.zoom;
      const y = p[1] * f.zoom;
      const s = pageToScreen(f, p);
      expect(a * x + c * y + e).toBeCloseTo(s[0]);
      expect(b * x + d * y + g).toBeCloseTo(s[1]);
    }
  });

  it("maps screen rectangles to page rectangles", () => {
    const f: Frame = { w: 100, h: 200, zoom: 1, rotation: 90 };
    // The page's top-left 10x20 corner sits at the box's top-right on screen.
    expect(
      screenRectToPage(f, { left: 180, top: 0, width: 20, height: 10 }),
    ).toEqual({ x: 0, y: 0, w: 10, h: 20 });
  });

  it("maps page space into PDF user space for intrinsic rotations", () => {
    const box = { x: 10, y: 20, w: 100, h: 200 };
    expect(toUser(0, box, [0, 0])).toEqual([10, 220]);
    expect(toUser(90, box, [0, 0])).toEqual([10, 20]);
    expect(toUser(180, box, [0, 0])).toEqual([110, 20]);
    expect(toUser(270, box, [0, 0])).toEqual([110, 220]);
    // Page space of a 90-degree page is 200 wide: its far corner is the user-space top-right.
    expect(toUser(90, box, [200, 100])).toEqual([110, 220]);
  });

  it("normalises rotations and steps zoom", () => {
    expect(normRotation(-90)).toBe(270);
    expect(normRotation(450)).toBe(90);
    expect(stepZoom(1, 1)).toBe(1.1);
    expect(stepZoom(1, -1)).toBe(0.9);
    expect(stepZoom(4, 1)).toBe(4);
  });
});

const sample = (): PdfData => ({
  ...initialData({ sha256: "a".repeat(64), size: 100, pageCount: 3 }),
  pages: [
    { id: "p1", src: 0, rotation: 0 },
    { id: "p2", src: 1, rotation: 0 },
    { id: "p3", src: 2, rotation: 0 },
  ],
  annotations: [
    {
      id: "a1",
      pageId: "p2",
      type: "rect",
      rect: { x: 10, y: 10, w: 50, h: 20 },
      color: "#ff0000",
      width: 2,
    },
  ],
});

describe("page operations", () => {
  let n = 0;
  const id = () => `n${++n}`;

  it("rotates selected pages", () => {
    const d = applyPageOp(sample(), {
      type: "rotate",
      ids: ["p1", "p3"],
      delta: -90,
    });
    expect(d.pages.map((p) => p.rotation)).toEqual([270, 0, 270]);
  });

  it("deletes pages with their annotations but never the last page", () => {
    const d = applyPageOp(sample(), { type: "delete", ids: ["p2"] });
    expect(d.pages.map((p) => p.id)).toEqual(["p1", "p3"]);
    expect(d.annotations).toEqual([]);
    const all = sample();
    expect(applyPageOp(all, { type: "delete", ids: ["p1", "p2", "p3"] })).toBe(
      all,
    );
  });

  it("duplicates a page and its annotations right after it", () => {
    const d = applyPageOp(sample(), { type: "duplicate", ids: ["p2"] }, id);
    expect(d.pages.map((p) => p.src)).toEqual([0, 1, 1, 2]);
    const copy = d.pages[2];
    expect(d.annotations).toHaveLength(2);
    expect(d.annotations[1]).toMatchObject({ pageId: copy.id, type: "rect" });
    expect(d.annotations[1].id).not.toBe("a1");
  });

  it("moves, inserts blank pages and inserts merged pages", () => {
    let d = applyPageOp(sample(), { type: "move", id: "p3", to: 0 });
    expect(d.pages.map((p) => p.id)).toEqual(["p3", "p1", "p2"]);
    d = applyPageOp(d, { type: "insertBlank", index: 1, size: [612, 792] }, id);
    expect(d.pages[1]).toMatchObject({ src: -1, size: [612, 792] });
    d = applyPageOp(d, { type: "insert", index: 99, srcs: [3, 4] }, id);
    expect(d.pages.slice(-2).map((p) => p.src)).toEqual([3, 4]);
  });
});

describe("annotations", () => {
  const ink: Annotation = {
    id: "i",
    pageId: "p",
    type: "ink",
    points: [
      [0, 0],
      [10, 10],
      [20, 0],
    ],
    color: "#000000",
    width: 2,
  };

  it("measures, moves and resizes", () => {
    expect(bounds(ink)).toEqual({ x: 0, y: 0, w: 20, h: 10 });
    expect(bounds(translate(ink, 5, 5))).toEqual({ x: 5, y: 5, w: 20, h: 10 });
    expect(bounds(resize(ink, { x: 100, y: 100, w: 40, h: 40 }))).toEqual({
      x: 100,
      y: 100,
      w: 40,
      h: 40,
    });
  });

  it("hits strokes on the line, not inside the box", () => {
    expect(hitTest(ink, [5, 5])).toBe(true);
    expect(hitTest(ink, [10, 0], 1)).toBe(false);
    const outline: Annotation = {
      id: "r",
      pageId: "p",
      type: "rect",
      rect: { x: 0, y: 0, w: 100, h: 100 },
      color: "#000000",
      width: 1,
    };
    expect(hitTest(outline, [0, 50])).toBe(true);
    expect(hitTest(outline, [50, 50])).toBe(false);
    expect(hitTest({ ...outline, fill: "#ffffff" }, [50, 50])).toBe(true);
  });

  it("merges selection runs into one rectangle per line", () => {
    const merged = mergeLineRects([
      { x: 0, y: 0, w: 30, h: 10 },
      { x: 31, y: 1, w: 20, h: 9 },
      { x: 0, y: 14, w: 40, h: 10 },
    ]);
    expect(merged).toEqual([
      { x: 0, y: 0, w: 51, h: 10 },
      { x: 0, y: 14, w: 40, h: 10 },
    ]);
  });
});

describe("model", () => {
  it("sniffs PDF bytes", () => {
    expect(isPdfBytes(new TextEncoder().encode("%PDF-1.7\n"))).toBe(true);
    expect(isPdfBytes(new TextEncoder().encode("\n\n%PDF-1.4"))).toBe(true);
    expect(isPdfBytes(new TextEncoder().encode("<html>"))).toBe(false);
  });

  it("parses a stored model and drops only the bad entries", () => {
    const raw = {
      ...sample(),
      pages: [
        ...sample().pages,
        { id: "x", src: 9, rotation: 0 },
        { id: "y", src: 0, rotation: 45 },
      ],
      annotations: [
        ...sample().annotations,
        {
          id: "b",
          pageId: "p1",
          type: "rect",
          rect: { x: 0, y: 0, w: 1, h: 1 },
          color: "red",
          width: 1,
        },
        {
          id: "c",
          pageId: "gone",
          type: "note",
          at: [0, 0],
          text: "",
          color: "#ffcc00",
        },
        {
          id: "d",
          pageId: "p1",
          type: "image",
          rect: { x: 0, y: 0, w: 1, h: 1 },
          src: "https://example.com/x.png",
        },
      ],
    };
    const d = parsePdfData(raw);
    expect(d?.pages.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
    expect(d?.annotations.map((a) => a.id)).toEqual(["a1"]);
    expect(parsePdfData({ html: "<p>" })).toBeNull();
    expect(parsePdfData(null)).toBeNull();
  });
});

describe("export", () => {
  async function makePdf() {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (const [i, size] of (
      [
        [612, 792],
        [300, 400],
        [595, 842],
      ] as [number, number][]
    ).entries()) {
      const page = doc.addPage(size);
      page.drawText(`Page ${i + 1}`, { x: 20, y: 20, size: 12, font });
    }
    doc.getPage(2).setRotation(degrees(90));
    const form = doc.getForm();
    const field = form.createTextField("name");
    field.addToPage(doc.getPage(0), { x: 50, y: 600, width: 200, height: 20 });
    const box = form.createCheckBox("agree");
    box.addToPage(doc.getPage(0), { x: 50, y: 560, width: 15, height: 15 });
    return doc.save();
  }

  it("applies page order, rotation, annotations and form values", async () => {
    const original = await makePdf();
    let data = initialData({
      sha256: "b".repeat(64),
      size: original.length,
      pageCount: 3,
    });
    const [p1, p2, p3] = data.pages;
    data = applyPageOp(data, { type: "move", id: p3.id, to: 0 }); // p3 p1 p2
    data = applyPageOp(data, { type: "rotate", ids: [p1.id], delta: 90 });
    data = applyPageOp(data, { type: "delete", ids: [p2.id] }); // p3 p1
    data = applyPageOp(data, { type: "duplicate", ids: [p1.id] }); // p3 p1 p1'
    data = applyPageOp(data, {
      type: "insertBlank",
      index: 0,
      size: [200, 100],
    }); // blank p3 p1 p1'
    data = {
      ...data,
      forms: { name: "Ada Lovelace", agree: true },
      annotations: [
        {
          id: "r",
          pageId: p1.id,
          type: "rect",
          rect: { x: 10, y: 10, w: 50, h: 20 },
          color: "#ff0000",
          width: 2,
        },
        {
          id: "t",
          pageId: p3.id,
          type: "text",
          rect: { x: 10, y: 10, w: 200, h: 20 },
          text: "Hello\nworld",
          size: 12,
          color: "#000000",
        },
        {
          id: "n",
          pageId: p3.id,
          type: "note",
          at: [20, 20],
          text: "Check this",
          color: "#ffcc00",
        },
        {
          id: "a",
          pageId: p1.id,
          type: "arrow",
          from: [0, 0],
          to: [100, 100],
          color: "#0000ff",
          width: 2,
        },
        {
          id: "s",
          pageId: p1.id,
          type: "stamp",
          rect: { x: 100, y: 100, w: 120, h: 40 },
          label: "Approved",
          color: "#2e7d32",
        },
        {
          id: "e",
          pageId: p1.id,
          type: "ellipse",
          rect: { x: 100, y: 200, w: 50, h: 30 },
          color: "#000000",
          width: 1,
          fill: "#ffff00",
        },
        {
          id: "h",
          pageId: p1.id,
          type: "highlight",
          rects: [{ x: 15, y: 760, w: 60, h: 14 }],
          color: "#ffd400",
        },
      ],
    };

    const bytes = await exportPdf(original, data, { title: "Out" });
    const out = await PDFDocument.load(bytes);
    expect(out.getPageCount()).toBe(4);
    expect(out.getTitle()).toBe("Out");
    const pages = out.getPages();
    expect(pages[0].getSize()).toEqual({ width: 200, height: 100 });
    expect(pages[1].getRotation().angle).toBe(90); // intrinsic rotation kept
    expect(pages[1].getSize()).toEqual({ width: 595, height: 842 });
    expect(pages[2].getRotation().angle).toBe(90); // user rotation
    expect(pages[3].getRotation().angle).toBe(90); // duplicate keeps it
    expect(pages[2].getSize()).toEqual({ width: 612, height: 792 });
    // The form is flattened into page content.
    expect(out.getForm().getFields()).toHaveLength(0);
    // The sticky note became a PDF comment on the rotated page.
    expect(pages[1].node.Annots()?.size()).toBe(1);
    // Duplicates do not share content arrays: each got its own drawing.
    expect(pages[2].node.Contents()).not.toBe(pages[3].node.Contents());
  });

  it("extracts a subset of pages", async () => {
    const original = await makePdf();
    const data = initialData({
      sha256: "c".repeat(64),
      size: original.length,
      pageCount: 3,
    });
    const bytes = await exportPdf(original, data, {
      pageIds: [data.pages[1].id],
    });
    const out = await PDFDocument.load(bytes);
    expect(out.getPageCount()).toBe(1);
    expect(out.getPage(0).getSize()).toEqual({ width: 300, height: 400 });
  });

  it("appends another PDF without moving the original pages", async () => {
    const a = await makePdf();
    const extra = await PDFDocument.create();
    extra.addPage([100, 100]);
    extra.addPage([120, 120]);
    const { bytes, start, count } = await appendPdf(a, await extra.save());
    expect([start, count]).toEqual([3, 2]);
    const out = await PDFDocument.load(bytes);
    expect(out.getPageCount()).toBe(5);
    expect(out.getPage(1).getSize()).toEqual({ width: 300, height: 400 });
    expect(out.getPage(4).getSize()).toEqual({ width: 120, height: 120 });
  });

  it("builds paths and keeps text encodable", () => {
    expect(ellipsePath({ x: 0, y: 0, w: 10, h: 10 })).toMatch(/^M 0 5 C/);
    expect(arrowHead([0, 0], [10, 0], 1)[0]).toEqual([10, 0]);
    expect(winAnsi("Café ✓\nok")).toBe("Café ?\nok");
  });
});

describe("history", () => {
  it("undoes and redoes, and a drag commits as one step", () => {
    let h = historyOf(1);
    h = commit(h, 2);
    const base = h.present;
    h = preview(h, 3);
    h = preview(h, 4);
    h = commit(h, 5, base);
    expect(h.past).toEqual([1, 2]);
    h = undo(h);
    expect(h.present).toBe(2);
    h = redo(h);
    expect(h.present).toBe(5);
    h = commit(undo(h), 9);
    expect(h.future).toEqual([]);
    expect(undo(historyOf(0))).toEqual(historyOf(0));
  });
});

describe("search", () => {
  it("finds case-insensitive matches inside runs", () => {
    const runs = [
      {
        str: "Hello World hello",
        transform: [10, 0, 0, 10, 100, 500],
        width: 170,
      },
    ];
    const m = findMatches(runs, "HELLO");
    expect(m).toHaveLength(2);
    expect(m[0][0]).toBeCloseTo(100);
    expect(m[0][2]).toBeCloseTo(150);
    expect(m[1][0]).toBeCloseTo(220);
    expect(m[0][1]).toBeLessThan(500);
    expect(m[0][3]).toBeGreaterThan(500);
    expect(findMatches(runs, "  ")).toEqual([]);
  });
});
