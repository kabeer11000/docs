/**
 * Plain conversions between a stored workbook snapshot (Univer's IWorkbookData shape, kept structural so
 * this module never imports the engine) and dense 2D grids used by import, export and thumbnails.
 */

export type CellValue = string | number | boolean | null;

/** `f` keeps the leading "=" like Univer does. */
export interface GridCell {
  v: CellValue;
  f?: string;
}

export type Grid = GridCell[][];

interface SnapshotCell {
  v?: CellValue;
  t?: number | null;
  f?: string | null;
  [key: string]: unknown;
}

export interface SnapshotSheet {
  id?: string;
  name?: string;
  cellData?: Record<string, Record<string, SnapshotCell | null | undefined> | null | undefined>;
  rowCount?: number;
  columnCount?: number;
  [key: string]: unknown;
}

export interface WorkbookSnapshot {
  id?: string;
  name?: string;
  sheetOrder: string[];
  sheets: Record<string, SnapshotSheet>;
  [key: string]: unknown;
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

export function isWorkbookSnapshot(x: unknown): x is WorkbookSnapshot {
  return isObject(x) && Array.isArray(x.sheetOrder) && isObject(x.sheets);
}

const BOOLEAN = 3;

function cellValue(cell: SnapshotCell | null | undefined): CellValue {
  const v = cell?.v;
  if (v === undefined || v === null) return null;
  if (cell?.t === BOOLEAN) return v === true || v === 1 || String(v).toUpperCase() === "TRUE";
  return v;
}

export function firstSheetId(snapshot: WorkbookSnapshot): string | undefined {
  return snapshot.sheetOrder.find((id) => snapshot.sheets[id]) ?? Object.keys(snapshot.sheets)[0];
}

/** Dense grid from A1 to the last used cell (optionally capped), for one sheet (default: the first). */
export function snapshotToGrid(
  snapshot: WorkbookSnapshot,
  sheetId = firstSheetId(snapshot),
  maxRows = Number.POSITIVE_INFINITY,
  maxCols = Number.POSITIVE_INFINITY,
): Grid {
  const cellData = sheetId ? snapshot.sheets[sheetId]?.cellData : undefined;
  if (!isObject(cellData)) return [];
  let rows = 0;
  let cols = 0;
  const cells: Array<[number, number, GridCell]> = [];
  for (const [r, row] of Object.entries(cellData)) {
    const ri = Number(r);
    if (!isObject(row) || !(ri < maxRows)) continue;
    for (const [c, cell] of Object.entries(row)) {
      const ci = Number(c);
      if (!(ci < maxCols)) continue;
      const v = cellValue(cell);
      const f = cell?.f || undefined;
      if (v === null && !f) continue;
      cells.push([ri, ci, f ? { v, f } : { v }]);
      rows = Math.max(rows, ri + 1);
      cols = Math.max(cols, ci + 1);
    }
  }
  const grid: Grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ v: null })));
  for (const [r, c, cell] of cells) grid[r][c] = cell;
  return grid;
}

function toSnapshotCell({ v, f }: GridCell): SnapshotCell | null {
  if (f) return v === null ? { f } : { f, v };
  if (v === null || v === "") return null;
  if (typeof v === "boolean") return { v: v ? 1 : 0, t: BOOLEAN };
  return typeof v === "number" ? { v, t: 2 } : { v, t: 1 };
}

/** Builds a workbook snapshot from named grids. An empty list gives one blank "Sheet1". */
export function gridsToSnapshot(sheets: Array<{ name: string; grid: Grid }>, name = "Workbook"): WorkbookSnapshot {
  const list = sheets.length ? sheets : [{ name: "Sheet1", grid: [] }];
  const snapshot: WorkbookSnapshot = { id: "workbook", name, sheetOrder: [], sheets: {} };
  list.forEach((sheet, i) => {
    const id = `sheet-${i + 1}`;
    const cellData: NonNullable<SnapshotSheet["cellData"]> = {};
    let cols = 0;
    sheet.grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        const out = toSnapshotCell(cell);
        if (!out) return;
        const target = (cellData[r] ??= {});
        target[c] = out;
        cols = Math.max(cols, c + 1);
      });
    });
    snapshot.sheetOrder.push(id);
    snapshot.sheets[id] = {
      id,
      name: sheet.name || `Sheet${i + 1}`,
      cellData,
      rowCount: Math.max(1000, sheet.grid.length + 100),
      columnCount: Math.max(26, cols + 5),
    };
  });
  return snapshot;
}

export const emptySnapshot = () => gridsToSnapshot([]);

/** Zips the engine's raw values and formulas (same shape) into a grid, trimming trailing empty rows/cols. */
export function gridFromRanges(values: ReadonlyArray<ReadonlyArray<unknown>>, formulas?: ReadonlyArray<ReadonlyArray<string>>): Grid {
  const grid: Grid = values.map((row, r) =>
    row.map((raw, c) => {
      const v: CellValue =
        raw === undefined || raw === null || raw === "" ? null : typeof raw === "object" ? String(raw) : (raw as CellValue);
      const f = formulas?.[r]?.[c];
      return f ? { v, f } : { v };
    }),
  );
  const empty = (cell: GridCell) => cell.v === null && !cell.f;
  while (grid.length && grid[grid.length - 1].every(empty)) grid.pop();
  const cols = grid.reduce((n, row) => {
    let last = row.length;
    while (last && empty(row[last - 1])) last--;
    return Math.max(n, last);
  }, 0);
  return grid.map((row) => row.slice(0, cols));
}

/** Text a cell shows when its number format is unknown. */
export function displayValue(v: CellValue): string {
  if (v === null) return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(10)));
  return v;
}

/** Key-order independent JSON, to tell whether two snapshots hold the same content. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isObject(value)) {
    return `{${Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
