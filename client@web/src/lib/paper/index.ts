import { atom } from "nanostores";

// Single source of truth for paper geometry: screen pages, pagination, page setup, print and export.
// CSS px are defined as 1/96 in, so screen and print share the same numbers.

export const PX_PER_IN = 96;
export const MM_PER_IN = 25.4;
export const PT_PER_IN = 72;

export type PaperId = "a3" | "a4" | "a5" | "letter" | "legal" | "tabloid";
export type Orientation = "portrait" | "landscape";
export type LengthUnit = "mm" | "in";

export interface Paper {
  id: PaperId;
  label: string;
  /** Portrait width/height in `unit`. */
  width: number;
  height: number;
  unit: LengthUnit;
}

export const PAPERS: readonly Paper[] = [
  { id: "a4", label: "A4", width: 210, height: 297, unit: "mm" },
  { id: "letter", label: "Letter", width: 8.5, height: 11, unit: "in" },
  { id: "legal", label: "Legal", width: 8.5, height: 14, unit: "in" },
  { id: "a5", label: "A5", width: 148, height: 210, unit: "mm" },
  { id: "a3", label: "A3", width: 297, height: 420, unit: "mm" },
  { id: "tabloid", label: "Tabloid", width: 11, height: 17, unit: "in" },
];

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PaperSettings {
  paper: PaperId;
  orientation: Orientation;
  /** Inches. */
  margins: Margins;
}

export const DEFAULT_PAPER_SETTINGS: PaperSettings = {
  paper: "letter",
  orientation: "portrait",
  margins: { top: 1, right: 1, bottom: 1, left: 1 },
};

/** Gap between pages on screen, px. */
export const PAGE_GAP = 24;

export function getPaper(id: PaperId): Paper {
  return PAPERS.find((p) => p.id === id) ?? PAPERS[1];
}

export const toInches = (value: number, unit: LengthUnit) => (unit === "mm" ? value / MM_PER_IN : value);
export const fromInches = (inches: number, unit: LengthUnit) => (unit === "mm" ? inches * MM_PER_IN : inches);
export const inToPx = (inches: number) => inches * PX_PER_IN;

/** Sheet size in inches, orientation applied. */
export function sheetInches(s: PaperSettings): { width: number; height: number } {
  const p = getPaper(s.paper);
  const w = toInches(p.width, p.unit);
  const h = toInches(p.height, p.unit);
  return s.orientation === "landscape" ? { width: h, height: w } : { width: w, height: h };
}

export interface PageGeometry {
  width: number;
  height: number;
  margins: Margins;
  contentWidth: number;
  contentHeight: number;
  gap: number;
}

/** Page geometry in CSS px. */
export function pageGeometry(s: PaperSettings): PageGeometry {
  const sheet = sheetInches(s);
  const width = inToPx(sheet.width);
  const height = inToPx(sheet.height);
  const margins = {
    top: inToPx(s.margins.top),
    right: inToPx(s.margins.right),
    bottom: inToPx(s.margins.bottom),
    left: inToPx(s.margins.left),
  };
  return {
    width,
    height,
    margins,
    contentWidth: width - margins.left - margins.right,
    contentHeight: height - margins.top - margins.bottom,
    gap: PAGE_GAP,
  };
}

const num = (n: number) => String(Math.round(n * 1000) / 1000);

/** `@page` rule in the paper's native units so the PDF sheet is exact (210mm, not 793.7px). */
export function cssPageRule(s: PaperSettings): string {
  const p = getPaper(s.paper);
  const [w, h] = s.orientation === "landscape" ? [p.height, p.width] : [p.width, p.height];
  const m = s.margins;
  return `@page { size: ${num(w)}${p.unit} ${num(h)}${p.unit}; margin: ${num(m.top)}in ${num(m.right)}in ${num(m.bottom)}in ${num(m.left)}in; }`;
}

/** Problems that make the settings unusable, empty when valid. */
export function validatePaper(s: PaperSettings): string[] {
  const sheet = sheetInches(s);
  const m = s.margins;
  const errors: string[] = [];
  if (Object.values(m).some((v) => !Number.isFinite(v) || v < 0)) errors.push("Margins cannot be negative.");
  if (m.left + m.right > sheet.width - 1) errors.push("Left and right margins leave less than 1 in for text.");
  if (m.top + m.bottom > sheet.height - 1) errors.push("Top and bottom margins leave less than 1 in for text.");
  return errors;
}

export function formatLength(inches: number, unit: LengthUnit): string {
  const v = fromInches(inches, unit);
  return unit === "mm" ? `${Math.round(v * 10) / 10} mm` : `${Math.round(v * 100) / 100} in`;
}

export function paperLabel(s: PaperSettings): string {
  const p = getPaper(s.paper);
  const [w, h] = s.orientation === "landscape" ? [p.height, p.width] : [p.width, p.height];
  return `${p.label}, ${w} x ${h} ${p.unit}`;
}

// Stored shape on the document (`document.pageSettings`), kept compatible with createDocument:
// { pageSize: "Letter", orientation, marginTop: 72, ... } with margins in points.
export interface StoredPageSettings {
  pageSize: string;
  orientation: Orientation;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  unit: "pt";
}

const PAPER_ALIASES: Record<string, PaperId> = { ledger: "tabloid", custom: "letter" };

/** Tolerant parse of whatever is stored; unknown sizes fall back to Letter, margins default to 1 in. */
export function fromStored(raw: unknown): PaperSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_PAPER_SETTINGS;
  const r = raw as Record<string, unknown>;
  const key = String(r.pageSize ?? "").toLowerCase();
  const paper = (PAPERS.some((p) => p.id === key) ? key : PAPER_ALIASES[key]) as PaperId | undefined;
  const orientation: Orientation = r.orientation === "landscape" ? "landscape" : "portrait";
  const values = [r.marginTop, r.marginRight, r.marginBottom, r.marginLeft].map(Number);
  // Points unless explicitly inches; legacy documents store 72 (= 1 in).
  const isPt = r.unit === "pt" || (r.unit !== "in" && values.some((v) => v > 12));
  const toIn = (v: number) => (Number.isFinite(v) && v >= 0 ? (isPt ? v / PT_PER_IN : v) : 1);
  const [top, right, bottom, left] = values.map(toIn);
  return { paper: paper ?? "letter", orientation, margins: { top, right, bottom, left } };
}

export function toStored(s: PaperSettings): StoredPageSettings {
  const pt = (v: number) => Math.round(v * PT_PER_IN * 100) / 100;
  return {
    pageSize: getPaper(s.paper).label,
    orientation: s.orientation,
    marginTop: pt(s.margins.top),
    marginRight: pt(s.margins.right),
    marginBottom: pt(s.margins.bottom),
    marginLeft: pt(s.margins.left),
    unit: "pt",
  };
}

/** Paper settings of the open document. */
export const $paperSettings = atom<PaperSettings>(DEFAULT_PAPER_SETTINGS);
