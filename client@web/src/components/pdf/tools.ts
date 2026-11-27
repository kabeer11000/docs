import type { Annotation } from "@/lib/pdf/model";

export type Tool =
  | "select"
  | "highlight"
  | "underline"
  | "strike"
  | "ink"
  | "rect"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "note"
  | "eraser";

export const MARKUP_TOOLS = new Set<Tool>(["highlight", "underline", "strike"]);
export const DRAW_TOOLS = new Set<Tool>([
  "ink",
  "rect",
  "ellipse",
  "line",
  "arrow",
  "text",
  "note",
  "eraser",
]);

/** Single-key shortcuts, as shown in tooltips. */
export const TOOL_KEYS: Record<string, Tool> = {
  v: "select",
  h: "highlight",
  u: "underline",
  s: "strike",
  p: "ink",
  r: "rect",
  o: "ellipse",
  l: "line",
  a: "arrow",
  t: "text",
  n: "note",
  e: "eraser",
};

export interface ToolStyle {
  color: string;
  width: number;
  size: number;
  fill: boolean;
}

export const DEFAULT_STYLES: Record<Tool, ToolStyle> = {
  select: { color: "#1d1d1f", width: 2, size: 14, fill: false },
  highlight: { color: "#ffd400", width: 2, size: 14, fill: false },
  underline: { color: "#0071e3", width: 2, size: 14, fill: false },
  strike: { color: "#e5484d", width: 2, size: 14, fill: false },
  ink: { color: "#1d1d1f", width: 2, size: 14, fill: false },
  rect: { color: "#e5484d", width: 2, size: 14, fill: false },
  ellipse: { color: "#e5484d", width: 2, size: 14, fill: false },
  line: { color: "#e5484d", width: 2, size: 14, fill: false },
  arrow: { color: "#e5484d", width: 2, size: 14, fill: false },
  text: { color: "#1d1d1f", width: 2, size: 14, fill: false },
  note: { color: "#ffc700", width: 2, size: 14, fill: false },
  eraser: { color: "#1d1d1f", width: 2, size: 14, fill: false },
};

export const PALETTE = [
  "#1d1d1f",
  "#e5484d",
  "#f76b15",
  "#ffc700",
  "#ffd400",
  "#30a46c",
  "#0071e3",
  "#8e4ec6",
  "#ffffff",
];

/** The tool whose style an annotation uses (the toolbar edits the selection with it). */
export const toolOf = (a: Annotation): Tool | null =>
  a.type === "image" || a.type === "stamp" ? null : (a.type as Tool);

export const STAMP_COLORS: Record<string, string> = {
  Approved: "#1e8e3e",
  Draft: "#6e6e73",
  Rejected: "#d93025",
  Confidential: "#d93025",
  Date: "#0071e3",
};
