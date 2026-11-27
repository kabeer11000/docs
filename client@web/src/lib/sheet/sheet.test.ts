import { describe, expect, it } from "vitest";
import { csvCell, csvToGrid, gridToCsv, parseCsv } from "./csv";
import {
  displayValue,
  emptySnapshot,
  gridFromRanges,
  gridsToSnapshot,
  isWorkbookSnapshot,
  snapshotToGrid,
  stableStringify,
} from "./grid";
import { gridToXlsx, xlsxToSnapshot } from "./xlsx";

describe("snapshot <-> grid", () => {
  it("round-trips values, booleans and formulas", () => {
    const grid = [
      [{ v: "Name" }, { v: "Qty" }, { v: "Ok" }],
      [{ v: "Pens" }, { v: 3 }, { v: true }],
      [{ v: "Total" }, { v: 3, f: "=SUM(B2:B2)" }, { v: false }],
    ];
    const snap = gridsToSnapshot([{ name: "Stock", grid }]);
    expect(isWorkbookSnapshot(snap)).toBe(true);
    expect(snap.sheets[snap.sheetOrder[0]].name).toBe("Stock");
    expect(snapshotToGrid(snap)).toEqual(grid);
  });

  it("gives a blank Sheet1 for an empty workbook", () => {
    const snap = emptySnapshot();
    expect(snap.sheetOrder).toHaveLength(1);
    expect(snap.sheets[snap.sheetOrder[0]].name).toBe("Sheet1");
    expect(snapshotToGrid(snap)).toEqual([]);
  });

  it("reads sparse Univer cellData and caps the area", () => {
    const snap = {
      sheetOrder: ["a"],
      sheets: { a: { cellData: { 0: { 0: { v: "x" } }, 2: { 1: { v: 1, t: 3 } }, 20: { 20: { v: "far" } } } } },
    };
    expect(snapshotToGrid(snap, "a", 5, 5)).toEqual([
      [{ v: "x" }, { v: null }],
      [{ v: null }, { v: null }],
      [{ v: null }, { v: true }],
    ]);
  });

  it("rejects things that are not snapshots", () => {
    for (const x of [null, undefined, "x", [], { sheets: {} }, { sheetOrder: [], sheets: [] }]) {
      expect(isWorkbookSnapshot(x)).toBe(false);
    }
  });

  it("zips engine ranges and trims empty edges", () => {
    const grid = gridFromRanges(
      [
        [1, "", null],
        [2, 3, ""],
        ["", null, ""],
      ],
      [
        ["", "", ""],
        ["", "=A1+A2", ""],
        ["", "", ""],
      ],
    );
    expect(grid).toEqual([
      [{ v: 1 }, { v: null }],
      [{ v: 2 }, { v: 3, f: "=A1+A2" }],
    ]);
  });

  it("compares snapshots regardless of key order", () => {
    expect(stableStringify({ a: 1, b: { c: [1, { d: 2, e: 3 }] } })).toBe(stableStringify({ b: { c: [1, { e: 3, d: 2 }] }, a: 1 }));
    expect(stableStringify({ a: 1 })).not.toBe(stableStringify({ a: 2 }));
  });

  it("formats display values", () => {
    expect(displayValue(0.1 + 0.2)).toBe("0.3");
    expect(displayValue(true)).toBe("TRUE");
    expect(displayValue(null)).toBe("");
  });
});

describe("csv", () => {
  it("quotes commas, quotes, newlines and edge spaces", () => {
    const csv = gridToCsv([
      [{ v: "a,b" }, { v: 'say "hi"' }, { v: "two\nlines" }],
      [{ v: " pad" }, { v: 1.5 }, { v: 2, f: "=1+1" }],
    ]);
    expect(csv).toBe('"a,b","say ""hi""","two\nlines"\r\n" pad",1.5,2');
  });

  it("parses quoted fields, CRLF, BOM and trailing newline", () => {
    expect(parseCsv('\uFEFFa,"b,c","d ""q"""\r\n"x\r\ny",,z\n')).toEqual([
      ["a", "b,c", 'd "q"'],
      ["x\r\ny", "", "z"],
    ]);
  });

  it("round-trips through text", () => {
    const rows = [["a,b", 'q"', "n\nl", ""]];
    const text = gridToCsv(rows.map((r) => r.map((v) => ({ v }))));
    expect(parseCsv(text)).toEqual(rows);
  });

  it("types cells and keeps formulas", () => {
    expect(csvCell("42")).toEqual({ v: 42 });
    expect(csvCell("-1.5e3")).toEqual({ v: -1500 });
    expect(csvCell("007")).toEqual({ v: "007" });
    expect(csvCell("1,000")).toEqual({ v: "1,000" });
    expect(csvCell("true")).toEqual({ v: true });
    expect(csvCell("=SUM(A1:A2)")).toEqual({ v: null, f: "=SUM(A1:A2)" });
    expect(csvCell("=")).toEqual({ v: "=" });
    expect(csvCell("")).toEqual({ v: null });
    expect(csvToGrid("a,1\n")).toEqual([[{ v: "a" }, { v: 1 }]]);
  });
});

describe("xlsx", () => {
  it("round-trips values and formulas through exceljs", async () => {
    const grid = [
      [{ v: "Item" }, { v: "Cost" }],
      [{ v: "Tea" }, { v: 2.5 }],
      [{ v: "Total" }, { v: 2.5, f: "=SUM(B2:B2)" }],
      [{ v: true }, { v: null }],
    ];
    const blob = await gridToXlsx(grid, "Costs");
    const snap = await xlsxToSnapshot(await blob.arrayBuffer());
    const id = snap.sheetOrder[0];
    expect(snap.sheets[id].name).toBe("Costs");
    expect(snapshotToGrid(snap)).toEqual(grid);
  }, 60_000);
});
