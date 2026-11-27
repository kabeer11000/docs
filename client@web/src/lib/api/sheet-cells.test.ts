import { describe, expect, it } from "vitest";
import {
  columnIndex,
  columnLetters,
  emptyWorkbook,
  findSheet,
  formatA1Range,
  loadWorkbook,
  parseA1Range,
  readCells,
  usedRange,
  type Workbook,
  writeCells,
} from "./sheet-cells";

describe("A1 notation", () => {
  it("converts columns both ways", () => {
    expect(columnIndex("A")).toBe(0);
    expect(columnIndex("z")).toBe(25);
    expect(columnIndex("AA")).toBe(26);
    expect(columnIndex("AZ")).toBe(51);
    expect(columnIndex("ZZZ")).toBe(18277);
    for (const n of [0, 25, 26, 51, 52, 701, 702, 18277]) expect(columnIndex(columnLetters(n))).toBe(n);
    expect(columnLetters(27)).toBe("AB");
  });

  it("parses single cells and ranges", () => {
    expect(parseA1Range("A1")).toEqual({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
    expect(parseA1Range("A1:D20")).toEqual({ startRow: 0, startCol: 0, endRow: 19, endCol: 3 });
    expect(parseA1Range(" b2:c3 ")).toEqual({ startRow: 1, startCol: 1, endRow: 2, endCol: 2 });
  });

  it("normalises reversed corners", () => {
    expect(parseA1Range("D20:A1")).toEqual(parseA1Range("A1:D20"));
    expect(parseA1Range("A5:C1")).toEqual({ startRow: 0, startCol: 0, endRow: 4, endCol: 2 });
  });

  it("rejects malformed input", () => {
    for (const bad of ["", "A", "1", "A0", "A1:", ":B2", "A1:B", "AAAA1", "A-1", "A1:B2:C3", "$A$1", "Sheet1!A1", "A1.5"]) {
      expect(parseA1Range(bad), bad).toBeNull();
    }
  });

  it("formats ranges", () => {
    expect(formatA1Range({ startRow: 0, startCol: 0, endRow: 19, endCol: 3 })).toBe("A1:D20");
    expect(formatA1Range({ startRow: 4, startCol: 27, endRow: 4, endCol: 27 })).toBe("AB5");
  });
});

function workbook(): Workbook {
  return {
    id: "wb",
    sheetOrder: ["s2", "s1"],
    sheets: {
      s1: { id: "s1", name: "Data", cellData: { 0: { 0: { v: "x" } } } },
      s2: {
        id: "s2",
        name: "Summary",
        rowCount: 5,
        columnCount: 3,
        cellData: { 0: { 0: { v: "Name", t: 1, s: "bold" }, 1: { v: 3, t: 2 } }, 2: { 2: { f: "=A1", s: "num" } } },
      },
    },
  };
}

describe("sheet selection", () => {
  it("defaults to the first sheet in sheetOrder", () => {
    expect(findSheet(workbook())?.id).toBe("s2");
  });
  it("finds by id or name", () => {
    expect(findSheet(workbook(), "s1")?.name).toBe("Data");
    expect(findSheet(workbook(), "Data")?.id).toBe("s1");
    expect(findSheet(workbook(), "nope")).toBeNull();
  });
  it("handles workbooks without sheets", () => {
    expect(findSheet({})).toBeNull();
  });
});

describe("readCells", () => {
  it("returns a dense grid with nulls for empty cells and formula sources", () => {
    const sheet = findSheet(workbook())!;
    expect(readCells(sheet, parseA1Range("A1:C3")!)).toEqual([
      ["Name", 3, null],
      [null, null, null],
      [null, null, "=A1"],
    ]);
  });
  it("computes the used range", () => {
    expect(usedRange(findSheet(workbook())!)).toEqual({ startRow: 0, startCol: 0, endRow: 2, endCol: 2 });
    expect(usedRange({ id: "e", cellData: {} })).toBeNull();
  });
});

describe("writeCells", () => {
  it("writes typed values, formulas and clears, keeping styles", () => {
    const wb = workbook();
    const sheet = findSheet(wb)!;
    const written = writeCells(sheet, 0, 0, [
      ["Title", 42, true],
      [null, "=SUM(B1:B1)", false],
    ]);
    expect(written).toEqual({ startRow: 0, startCol: 0, endRow: 1, endCol: 2 });
    expect(sheet.cellData![0][0]).toEqual({ v: "Title", t: 1, s: "bold" });
    expect(sheet.cellData![0][1]).toEqual({ v: 42, t: 2 });
    expect(sheet.cellData![0][2]).toEqual({ v: true, t: 3 });
    expect(sheet.cellData![1][0]).toBeUndefined();
    expect(sheet.cellData![1][1]).toEqual({ f: "=SUM(B1:B1)" });
    expect(sheet.cellData![1][2]).toEqual({ v: false, t: 3 });
  });

  it("clearing a styled formula cell keeps only its style", () => {
    const sheet = findSheet(workbook())!;
    writeCells(sheet, 2, 2, [[null]]);
    expect(sheet.cellData![2][2]).toEqual({ s: "num" });
  });

  it("round-trips through readCells", () => {
    const sheet = findSheet(workbook(), "s1")!;
    writeCells(sheet, 9, 26, [
      [1, 2],
      [3, "four"],
    ]);
    expect(readCells(sheet, parseA1Range("AA10:AB11")!)).toEqual([
      [1, 2],
      [3, "four"],
    ]);
  });

  it("grows rowCount and columnCount when writing past them", () => {
    const sheet = findSheet(workbook())!;
    writeCells(sheet, 9, 4, [["x"]]);
    expect(sheet.rowCount).toBe(10);
    expect(sheet.columnCount).toBe(5);
  });

  it("works on a sheet without cellData", () => {
    const sheet: Parameters<typeof writeCells>[0] = { id: "n" };
    writeCells(sheet, 0, 0, [["a"]]);
    expect(sheet.cellData).toEqual({ 0: { 0: { v: "a", t: 1 } } });
  });
});

describe("loadWorkbook", () => {
  it("creates an empty workbook for never-opened sheets", () => {
    const { workbook: wb, storedAsString } = loadWorkbook(null, "f1");
    expect(storedAsString).toBe(false);
    expect(wb).toEqual(emptyWorkbook("f1"));
    expect(findSheet(wb)?.name).toBe("Sheet1");
  });
  it("parses JSON strings and remembers the storage form", () => {
    const { workbook: wb, storedAsString } = loadWorkbook(JSON.stringify(workbook()), "f1");
    expect(storedAsString).toBe(true);
    expect(findSheet(wb)?.id).toBe("s2");
  });
  it("clones objects so the stored snapshot is not mutated", () => {
    const original = workbook();
    const { workbook: wb } = loadWorkbook(original, "f1");
    writeCells(findSheet(wb)!, 0, 0, [["changed"]]);
    expect(original.sheets!.s2.cellData![0][0].v).toBe("Name");
  });
});
