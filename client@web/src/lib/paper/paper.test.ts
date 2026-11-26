import { describe, expect, it } from "vitest";
import { cssPageRule, DEFAULT_PAPER_SETTINGS, fromStored, pageGeometry, sheetInches, toStored, validatePaper, type PaperSettings } from "./index";
import { computeBreaks } from "./paginate";

const s = (paper: PaperSettings["paper"], orientation: PaperSettings["orientation"] = "portrait", m = 1): PaperSettings => ({
  paper,
  orientation,
  margins: { top: m, right: m, bottom: m, left: m },
});

describe("paper sizes", () => {
  it("uses real dimensions at 96 px/in", () => {
    expect(pageGeometry(s("letter"))).toMatchObject({ width: 816, height: 1056, contentWidth: 624, contentHeight: 864 });
    const a4 = pageGeometry(s("a4"));
    expect(a4.width).toBeCloseTo((210 / 25.4) * 96, 6);
    expect(a4.height).toBeCloseTo((297 / 25.4) * 96, 6);
    expect(sheetInches(s("legal"))).toEqual({ width: 8.5, height: 14 });
    expect(sheetInches(s("tabloid"))).toEqual({ width: 11, height: 17 });
    expect(sheetInches(s("a5")).width).toBeCloseTo(148 / 25.4, 6);
    expect(sheetInches(s("a3")).height).toBeCloseTo(420 / 25.4, 6);
  });

  it("swaps sides in landscape", () => {
    expect(pageGeometry(s("letter", "landscape"))).toMatchObject({ width: 1056, height: 816 });
  });

  it("writes @page in native units", () => {
    expect(cssPageRule(s("a4"))).toBe("@page { size: 210mm 297mm; margin: 1in 1in 1in 1in; }");
    expect(cssPageRule(s("letter", "landscape", 0.5))).toBe("@page { size: 11in 8.5in; margin: 0.5in 0.5in 0.5in 0.5in; }");
  });

  it("validates margins", () => {
    expect(validatePaper(s("a5", "portrait", 3.7))).toHaveLength(2);
    expect(validatePaper(s("a4"))).toEqual([]);
  });

  it("reads legacy stored settings (points) and round-trips", () => {
    expect(fromStored({ pageSize: "Letter", orientation: "portrait", marginTop: 72, marginBottom: 72, marginLeft: 72, marginRight: 72 })).toEqual(
      DEFAULT_PAPER_SETTINGS,
    );
    expect(fromStored(undefined)).toEqual(DEFAULT_PAPER_SETTINGS);
    expect(fromStored({ pageSize: "weird" }).paper).toBe("letter");
    const a4 = { paper: "a4", orientation: "landscape", margins: { top: 0.5, right: 0.75, bottom: 1, left: 0.1 } } as PaperSettings;
    expect(fromStored(toStored(a4))).toEqual(a4);
  });
});

describe("computeBreaks", () => {
  const b = (height: number, marginTop = 0, marginBottom = 0) => ({ height, marginTop, marginBottom });

  it("keeps everything on one page when it fits", () => {
    expect(computeBreaks([b(100), b(100)], 300, 50)).toEqual({ breaks: [], pages: 1 });
  });

  it("pushes the block that overflows to the next page with a filling spacer", () => {
    // block 0 ends at 90, block 1 spans 110-200, block 2 would end at 310 > 300
    const { breaks, pages } = computeBreaks([b(90, 10, 10), b(90, 10, 10), b(90, 10, 10), b(90, 10, 10)], 300, 50);
    expect(pages).toBe(2);
    expect(breaks).toEqual([{ index: 2, height: 350 - 200, pullUp: 10 }]);
  });

  it("ignores the top margin of the first block on a page", () => {
    expect(computeBreaks([b(300, 40)], 300, 50).pages).toBe(1);
  });

  it("honours manual page breaks", () => {
    const { breaks, pages } = computeBreaks([b(10), { ...b(0), breakAfter: true }, b(10)], 300, 50);
    expect(pages).toBe(2);
    expect(breaks).toEqual([{ index: 2, height: 350 - 10, pullUp: 0 }]);
  });

  it("counts pages for a block taller than a page without breaking before it at the top", () => {
    const { breaks, pages } = computeBreaks([b(700)], 300, 50);
    expect(breaks).toEqual([]);
    expect(pages).toBe(3);
  });

  it("produces many pages for long documents", () => {
    const blocks = Array.from({ length: 100 }, () => b(30, 0, 0));
    const { pages, breaks } = computeBreaks(blocks, 300, 50);
    expect(pages).toBe(10);
    expect(breaks.map((x) => x.index)).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90]);
  });
});
