// Read/write cell values on a stored Univer IWorkbookData snapshot:
// workbook.sheets[sheetId].cellData[row][col] = { v, t, f, s }. Rows and columns are 0-based.

export type CellValue = string | number | boolean | null;

interface CellData {
  v?: CellValue;
  t?: number;
  f?: string;
  s?: unknown;
  [key: string]: unknown;
}

interface Worksheet {
  id: string;
  name?: string;
  cellData?: Record<string, Record<string, CellData>>;
  rowCount?: number;
  columnCount?: number;
  [key: string]: unknown;
}

export interface Workbook {
  id?: string;
  sheetOrder?: string[];
  sheets?: Record<string, Worksheet>;
  [key: string]: unknown;
}

export interface CellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

/** Univer CellValueType: 1 string, 2 number, 3 boolean. */
const CELL_TYPE = { string: 1, number: 2, boolean: 3 } as const;

// Keeps a single API call from allocating huge grids.
export const MAX_RANGE_CELLS = 100_000;

/** "A" -> 0, "Z" -> 25, "AA" -> 26. */
export function columnIndex(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** 0 -> "A", 26 -> "AA". */
export function columnLetters(index: number): string {
  let s = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** Parses "B2" or "A1:D20" (either corner order, case-insensitive). Null when malformed. */
export function parseA1Range(input: string): CellRange | null {
  const m = input.trim().match(/^([A-Za-z]{1,3})([1-9]\d{0,6})(?::([A-Za-z]{1,3})([1-9]\d{0,6}))?$/);
  if (!m) return null;
  const r1 = Number(m[2]) - 1;
  const c1 = columnIndex(m[1]);
  const r2 = m[4] ? Number(m[4]) - 1 : r1;
  const c2 = m[3] ? columnIndex(m[3]) : c1;
  return { startRow: Math.min(r1, r2), startCol: Math.min(c1, c2), endRow: Math.max(r1, r2), endCol: Math.max(c1, c2) };
}

export function formatA1Range(r: CellRange): string {
  const a = `${columnLetters(r.startCol)}${r.startRow + 1}`;
  const b = `${columnLetters(r.endCol)}${r.endRow + 1}`;
  return a === b ? a : `${a}:${b}`;
}

export const rangeSize = (r: CellRange) => (r.endRow - r.startRow + 1) * (r.endCol - r.startCol + 1);

/** Sheet by id or name; the first sheet in sheetOrder when no selector is given. */
export function findSheet(wb: Workbook, selector?: string | null): Worksheet | null {
  const sheets = wb.sheets ?? {};
  if (!selector) {
    const firstId = wb.sheetOrder?.find((id) => sheets[id]) ?? Object.keys(sheets)[0];
    return firstId ? sheets[firstId] : null;
  }
  return sheets[selector] ?? Object.values(sheets).find((s) => s.name === selector) ?? null;
}

/** Smallest range covering every non-empty cell, or null for an empty sheet. */
export function usedRange(sheet: Worksheet): CellRange | null {
  let endRow = -1;
  let endCol = -1;
  for (const [r, row] of Object.entries(sheet.cellData ?? {})) {
    for (const c of Object.keys(row ?? {})) {
      if (row[c] == null) continue;
      endRow = Math.max(endRow, Number(r));
      endCol = Math.max(endCol, Number(c));
    }
  }
  return endRow < 0 ? null : { startRow: 0, startCol: 0, endRow, endCol };
}

/** 2D values for the range; formulas come back as their source ("=SUM(A1:A3)") when no cached value exists. */
export function readCells(sheet: Worksheet, range: CellRange): CellValue[][] {
  const out: CellValue[][] = [];
  for (let r = range.startRow; r <= range.endRow; r++) {
    const row = sheet.cellData?.[r];
    const line: CellValue[] = [];
    for (let c = range.startCol; c <= range.endCol; c++) {
      const cell = row?.[c];
      line.push(cell?.v ?? cell?.f ?? null);
    }
    out.push(line);
  }
  return out;
}

/**
 * Writes values with their top-left corner at (startRow, startCol), mutating the sheet.
 * null clears a cell's value (keeping its style); strings starting with "=" become formulas.
 */
export function writeCells(sheet: Worksheet, startRow: number, startCol: number, values: CellValue[][]): CellRange {
  sheet.cellData ??= {};
  let endCol = startCol;
  values.forEach((line, i) => {
    const r = startRow + i;
    line.forEach((value, j) => {
      const c = startCol + j;
      endCol = Math.max(endCol, c);
      const row = (sheet.cellData![r] ??= {});
      const { v: _v, t: _t, f: _f, si: _si, p: _p, ...keep } = row[c] ?? {};
      if (value === null) {
        if (Object.keys(keep).length) row[c] = keep;
        else delete row[c];
      } else if (typeof value === "string" && value.startsWith("=")) {
        row[c] = { ...keep, f: value };
      } else {
        row[c] = { ...keep, v: value, t: CELL_TYPE[typeof value as "string" | "number" | "boolean"] };
      }
    });
  });
  const endRow = startRow + Math.max(values.length, 1) - 1;
  if (sheet.rowCount != null && sheet.rowCount <= endRow) sheet.rowCount = endRow + 1;
  if (sheet.columnCount != null && sheet.columnCount <= endCol) sheet.columnCount = endCol + 1;
  return { startRow, startCol, endRow, endCol };
}

/** Minimal workbook for a sheet file that has never been opened (data is still null). */
export function emptyWorkbook(id: string): Workbook {
  return {
    id,
    sheetOrder: ["sheet1"],
    sheets: { sheet1: { id: "sheet1", name: "Sheet1", cellData: {}, rowCount: 1000, columnCount: 26 } },
  };
}

/** Workbook from a file's stored data (object, JSON string, or null for a never-opened sheet). */
export function loadWorkbook(data: unknown, fileId: string): { workbook: Workbook; storedAsString: boolean } {
  if (typeof data === "string") return { workbook: JSON.parse(data) as Workbook, storedAsString: true };
  if (data && typeof data === "object") return { workbook: structuredClone(data) as Workbook, storedAsString: false };
  return { workbook: emptyWorkbook(fileId), storedAsString: false };
}
