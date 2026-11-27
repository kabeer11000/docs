import { displayValue } from "./grid";

/**
 * Lightweight charts that float over the grid. Stored next to the workbook in the sheet's `data`
 * under CHARTS_KEY; values are always read live from the cells in `range`.
 */
export const CHARTS_KEY = "__charts";

export type ChartType = "bar" | "line" | "pie";
export const CHART_TYPES: readonly ChartType[] = ["bar", "line", "pie"];

export interface ChartRange {
  startRow: number;
  startColumn: number;
  endRow: number;
  endColumn: number;
}

export interface SheetChart {
  id: string;
  sheetId: string;
  type: ChartType;
  range: ChartRange;
  /** Card position and size in px, relative to the grid's top-left corner. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ChartSeries {
  name: string;
  values: number[];
}

export interface ChartData {
  labels: string[];
  series: ChartSeries[];
}

/** Light and dark categorical order (validated for colour-vision deficiency against both surfaces). */
export const CHART_COLORS = {
  light: ["#0e9f6e", "#2a78d6", "#eb6834", "#6250d6", "#eda100", "#e87ba4"],
  dark: ["#199e70", "#3987e5", "#d95926", "#9085e9", "#c98500", "#d55181"],
} as const;

/** Series past the palette fold away: identity must never come from a generated hue. */
export const MAX_SERIES = CHART_COLORS.light.length;

export function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const s = v.trim().replace(/,/g, "");
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const text = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "object" ? String(v) : displayValue(v as never)).trim();

/**
 * Cell values (rows of the selected range) as chart data. The first row is a header when its value
 * cells hold no numbers; the first column is the label column when its body cells are not all numbers.
 * Columns without any number are dropped.
 */
export function chartData(values: ReadonlyArray<ReadonlyArray<unknown>>): ChartData {
  const rows = values.filter((row) => row.some((v) => text(v) !== ""));
  if (!rows.length) return { labels: [], series: [] };
  const width = Math.max(...rows.map((r) => r.length));
  const at = (r: number, c: number) => rows[r]?.[c];

  const firstColText = rows.some((_, r) => r > 0 && text(at(r, 0)) !== "" && toNumber(at(r, 0)) === null);
  const labelCol = width > 1 && (firstColText || (rows.length === 1 && toNumber(at(0, 0)) === null)) ? 0 : -1;
  const valueCols = Array.from({ length: width }, (_, c) => c).filter((c) => c !== labelCol);
  const headerRow = rows.length > 1 && valueCols.every((c) => toNumber(at(0, c)) === null);
  const body = rows.slice(headerRow ? 1 : 0);

  const labels = body.map((row, i) => (labelCol >= 0 ? text(row[labelCol]) : "") || String(i + 1));
  const series: ChartSeries[] = [];
  for (const c of valueCols) {
    const nums = body.map((row) => toNumber(row[c]));
    if (nums.every((n) => n === null)) continue;
    series.push({
      name: (headerRow ? text(at(0, c)) : "") || `Series ${series.length + 1}`,
      values: nums.map((n) => n ?? 0),
    });
  }
  return { labels, series: series.slice(0, MAX_SERIES) };
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const finite = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const index = (v: unknown) => Math.max(0, Math.floor(finite(v, 0)));

/** Valid charts from stored sheet data (anything malformed is skipped, never thrown). */
export function readCharts(data: unknown): SheetChart[] {
  const list = isObject(data) ? data[CHARTS_KEY] : undefined;
  if (!Array.isArray(list)) return [];
  const out: SheetChart[] = [];
  for (const item of list) {
    if (!isObject(item) || typeof item.id !== "string" || typeof item.sheetId !== "string" || !isObject(item.range)) continue;
    const r = item.range;
    const startRow = index(r.startRow);
    const startColumn = index(r.startColumn);
    out.push({
      id: item.id,
      sheetId: item.sheetId,
      type: CHART_TYPES.includes(item.type as ChartType) ? (item.type as ChartType) : "bar",
      range: { startRow, startColumn, endRow: Math.max(startRow, index(r.endRow)), endColumn: Math.max(startColumn, index(r.endColumn)) },
      x: Math.max(0, finite(item.x, 40)),
      y: Math.max(0, finite(item.y, 40)),
      w: Math.max(240, finite(item.w, 420)),
      h: Math.max(180, finite(item.h, 280)),
    });
  }
  return out;
}

/** Splits stored data into the workbook snapshot (what the engine loads) and the charts. */
export function splitCharts<T>(data: T): { workbook: T; charts: SheetChart[] } {
  if (!isObject(data) || !(CHARTS_KEY in data)) return { workbook: data, charts: [] };
  const { [CHARTS_KEY]: _drop, ...workbook } = data;
  return { workbook: workbook as T, charts: readCharts(data) };
}

/** The value to store: the workbook plus its charts (the key is left out when there are none). */
export function joinCharts<T extends object>(workbook: T, charts: SheetChart[]): T {
  return charts.length ? { ...workbook, [CHARTS_KEY]: charts } : workbook;
}

export function columnName(c: number): string {
  let s = "";
  for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

export const rangeLabel = (r: ChartRange) =>
  `${columnName(r.startColumn)}${r.startRow + 1}:${columnName(r.endColumn)}${r.endRow + 1}`;

/** "Nice" axis ticks covering [min, max] (always includes 0 so bars have a baseline). */
export function niceTicks(min: number, max: number, count = 4): number[] {
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  if (lo === hi) return [0, 1];
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const ticks: number[] = [];
  for (let t = Math.floor(lo / step) * step; t <= hi + step * 1e-9; t += step) ticks.push(Number(t.toPrecision(12)));
  if (ticks[ticks.length - 1] < hi) ticks.push(Number((ticks[ticks.length - 1] + step).toPrecision(12)));
  return ticks;
}

export interface PieSlice {
  label: string;
  value: number;
}

/** Positive values of the first series; past the palette the smallest slices fold into "Other". */
export function pieSlices(data: ChartData): PieSlice[] {
  const values = data.series[0]?.values ?? [];
  const slices = data.labels.map((label, i) => ({ label, value: values[i] ?? 0 })).filter((s) => s.value > 0);
  if (slices.length <= MAX_SERIES) return slices;
  const sorted = [...slices].sort((a, b) => b.value - a.value);
  const keep = sorted.slice(0, MAX_SERIES - 1);
  const other = sorted.slice(MAX_SERIES - 1).reduce((n, s) => n + s.value, 0);
  return [...keep, { label: "Other", value: other }];
}
