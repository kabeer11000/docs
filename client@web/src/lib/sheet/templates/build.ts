import { columnName } from "../chart";
import {
  type CellValue,
  type GridCell,
  gridsToSnapshot,
  type WorkbookSnapshot,
} from "../grid";

/** A string starting with "=" is a formula; everything else is a literal value. */
export type Raw = CellValue;

export interface SheetSpec {
  name: string;
  rows: Raw[][];
  /** Column widths in px, from column A. */
  widths?: number[];
  /** Rows styled as table headers (0-based). Default: [0]. */
  header?: number[];
  /** Frozen top rows. Default: 1 when row 0 is a header, else none. */
  freeze?: number;
  /** Number formats as [A1 range, pattern]. */
  formats?: Array<[string, string]>;
  /** A1 ranges to bold (totals, labels). */
  bold?: string[];
  /** A1 ranges shown as a large title. */
  title?: string[];
}

export const SHEET_TEMPLATE_CATEGORIES = [
  "Finance",
  "Work",
  "Personal",
  "School",
] as const;
export type SheetTemplateCategory = (typeof SHEET_TEMPLATE_CATEGORIES)[number];

export interface SheetTemplate {
  id: string;
  name: string;
  description: string;
  category: SheetTemplateCategory;
  tags?: string[];
  sheets: SheetSpec[];
}

// Common number formats.
export const MONEY = "#,##0.00";
export const WHOLE = "#,##0";
export const PCT = "0%";
export const PCT2 = "0.00%";
export const DATE = "yyyy-mm-dd";
export const TIME = "hh:mm";
export const HOURS = "0.00";

/** Spreadsheet date serial (days since 1899-12-30) for a calendar date. */
export const date = (y: number, m: number, d: number) =>
  (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000;

/** "B2" -> [row 1, col 1] (0-based). */
export function parseCell(a1: string): [number, number] {
  const m = /^([A-Z]+)(\d+)$/.exec(a1);
  if (!m) throw new Error(`Bad cell reference: ${a1}`);
  const col =
    [...m[1]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return [Number(m[2]) - 1, col];
}

/** "B2:D9" (or a single cell) -> inclusive 0-based bounds. */
function parseRange(range: string) {
  const [a, b = a] = range.split(":");
  const [r1, c1] = parseCell(a);
  const [r2, c2] = parseCell(b);
  return {
    r1: Math.min(r1, r2),
    r2: Math.max(r1, r2),
    c1: Math.min(c1, c2),
    c2: Math.max(c1, c2),
  };
}

const HEADER_STYLE = {
  bl: 1,
  bg: { rgb: "#F3F4F6" },
  bd: { b: { s: 1, cl: { rgb: "#D1D5DB" } } },
  vt: 2,
};

type Style = Record<string, unknown>;

/** Turns a template into a valid Univer workbook snapshot: values, formulas, styles, widths, frozen header. */
export function buildWorkbook(template: SheetTemplate): WorkbookSnapshot {
  const toGrid = (rows: Raw[][]): GridCell[][] =>
    rows.map((row) =>
      row.map((v) =>
        typeof v === "string" && v.startsWith("=") ? { v: null, f: v } : { v },
      ),
    );
  const snapshot = gridsToSnapshot(
    template.sheets.map((s) => ({ name: s.name, grid: toGrid(s.rows) })),
    template.name,
  );

  const styles: Record<string, Style> = {};
  const styleIds = new Map<string, string>();
  const styleId = (style: Style) => {
    const key = JSON.stringify(style);
    let id = styleIds.get(key);
    if (!id) {
      id = `s${styleIds.size + 1}`;
      styleIds.set(key, id);
      styles[id] = style;
    }
    return id;
  };

  template.sheets.forEach((spec, i) => {
    const sheet = snapshot.sheets[snapshot.sheetOrder[i]];
    const cellStyles = new Map<string, Style>();
    const add = (range: string, style: Style) => {
      const { r1, r2, c1, c2 } = parseRange(range);
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++)
          cellStyles.set(`${r},${c}`, {
            ...cellStyles.get(`${r},${c}`),
            ...style,
          });
      }
    };

    const header = spec.header ?? [0];
    for (const r of header) {
      const width = spec.rows[r]?.length ?? 0;
      for (let c = 0; c < width; c++)
        if (spec.rows[r][c] !== null && spec.rows[r][c] !== "")
          add(cellName(r, c), HEADER_STYLE);
    }
    for (const [range, pattern] of spec.formats ?? [])
      add(range, { n: { pattern } });
    for (const range of spec.bold ?? []) add(range, { bl: 1 });
    for (const range of spec.title ?? []) add(range, { bl: 1, fs: 16 });

    sheet.cellData ??= {};
    const cellData = sheet.cellData;
    for (const [key, style] of cellStyles) {
      const [r, c] = key.split(",").map(Number);
      cellData[r] ??= {};
      const row = cellData[r];
      row[c] = { ...(row[c] ?? {}), s: styleId(style) };
    }

    if (spec.widths)
      sheet.columnData = Object.fromEntries(
        spec.widths.map((w, c) => [c, { w }]),
      );
    const freeze = spec.freeze ?? (header.includes(0) ? 1 : 0);
    if (freeze > 0)
      sheet.freeze = {
        xSplit: 0,
        ySplit: freeze,
        startRow: freeze,
        startColumn: -1,
      };
  });

  snapshot.styles = styles;
  return snapshot;
}

/** [row, col] (0-based) -> "B2". */
export const cellName = (r: number, c: number) => `${columnName(c)}${r + 1}`;
