import { columnName } from "../chart";
import {
  type CellValue,
  type GridCell,
  gridsToSnapshot,
  type WorkbookSnapshot,
} from "../grid";
import { evaluateWorkbook } from "./evaluate";

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
  /** A1 ranges shown as a large title in the accent colour. */
  title?: string[];
  /** A1 ranges styled as totals: bold, tinted, with an accent rule above. */
  totals?: string[];
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
  /** Header fill, title and totals colour (hex). */
  accent: string;
  sheets: SheetSpec[];
}

// Common number formats.
export const MONEY = "$#,##0.00";
export const MONEY0 = "$#,##0";
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

/** `hex` mixed toward white: 0 keeps it, 1 is white. */
export function tint(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const ch = (shift: number) => {
    const c = (n >> shift) & 255;
    return Math.round(c + (255 - c) * amount)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${ch(16)}${ch(8)}${ch(0)}`.toUpperCase();
}

type Style = Record<string, unknown>;

const BORDER = 1; // Univer BorderStyleTypes.THIN
const MEDIUM = 8; // Univer BorderStyleTypes.MEDIUM

/** Header cells: accent fill, white bold text, vertically centred. */
const headerStyle = (accent: string): Style => ({
  bl: 1,
  bg: { rgb: accent },
  cl: { rgb: "#FFFFFF" },
  vt: 2,
  bd: { b: { s: BORDER, cl: { rgb: accent } } },
});
const bandStyle = (accent: string): Style => ({
  bg: { rgb: tint(accent, 0.93) },
});
const totalStyle = (accent: string): Style => ({
  bl: 1,
  bg: { rgb: tint(accent, 0.86) },
  bd: { t: { s: MEDIUM, cl: { rgb: accent } } },
});
const titleStyle = (accent: string): Style => ({
  bl: 1,
  fs: 20,
  cl: { rgb: accent },
  vt: 2,
});

const isBlank = (v: Raw | undefined) =>
  v === null || v === undefined || v === "";

/**
 * Runs of filled header cells in a row, each banded down to the first row with nothing in its
 * columns, so side-by-side tables (a log and its summary) each get their own stripes.
 */
function headerBlocks(rows: Raw[][], r: number) {
  const blocks: Array<{ c1: number; c2: number; last: number }> = [];
  const head = rows[r] ?? [];
  for (let c = 0; c < head.length; c++) {
    if (isBlank(head[c])) continue;
    const c1 = c;
    while (c + 1 < head.length && !isBlank(head[c + 1])) c++;
    let last = r;
    while (
      last + 1 < rows.length &&
      rows[last + 1].slice(c1, c + 1).some((v) => !isBlank(v))
    )
      last++;
    blocks.push({ c1, c2: c, last });
  }
  return blocks;
}

/** Turns a template into a valid Univer workbook snapshot: values, formulas, styles, widths, frozen header. */
export function buildWorkbook(template: SheetTemplate): WorkbookSnapshot {
  // Cached results ride along with each formula so the first paint (and thumbnails) show numbers.
  const values = evaluateWorkbook(template.sheets);
  const toGrid = (rows: Raw[][], si: number): GridCell[][] =>
    rows.map((row, r) =>
      row.map((v, c) => {
        if (!(typeof v === "string" && v.startsWith("="))) return { v };
        const cached = values[si][r][c];
        return {
          v: cached === undefined || typeof cached === "object" ? null : cached,
          f: v,
        };
      }),
    );
  const snapshot = gridsToSnapshot(
    template.sheets.map((s, si) => ({
      name: s.name,
      grid: toGrid(s.rows, si),
    })),
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

    const { accent } = template;
    const header = spec.header ?? [0];
    const rowHeights: Record<number, { h: number }> = {};
    for (const r of header) {
      rowHeights[r] = { h: 30 };
      for (const { c1, c2, last } of headerBlocks(spec.rows, r)) {
        add(`${cellName(r, c1)}:${cellName(r, c2)}`, headerStyle(accent));
        for (let b = r + 2; b <= last; b += 2)
          add(`${cellName(b, c1)}:${cellName(b, c2)}`, bandStyle(accent));
      }
    }
    for (const [range, pattern] of spec.formats ?? [])
      add(range, { n: { pattern } });
    for (const range of spec.bold ?? []) add(range, { bl: 1 });
    for (const range of spec.totals ?? []) add(range, totalStyle(accent));
    for (const range of spec.title ?? []) {
      add(range, titleStyle(accent));
      rowHeights[parseRange(range).r1] = { h: 40 };
    }

    sheet.cellData ??= {};
    const cellData = sheet.cellData;
    for (const [key, style] of cellStyles) {
      const [r, c] = key.split(",").map(Number);
      cellData[r] ??= {};
      const row = cellData[r];
      row[c] = { ...(row[c] ?? {}), s: styleId(style) };
    }

    sheet.rowData = rowHeights;
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
