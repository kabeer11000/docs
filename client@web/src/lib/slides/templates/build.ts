import type {
  ChartKind,
  Layout,
  ShapeKind,
  Slide,
  SlideElement,
} from "../model";

/**
 * Small constructors so template files read as compositions rather than raw JSON. Every helper emits the
 * normalized element shape (no undefined keys), so `normalizeDeck(deck)` returns the template unchanged.
 */

/** Box in percent of the 1280x720 canvas: [x, y, w, h]. */
export type Box = [number, number, number, number];

type ShapeOpts = Pick<
  SlideElement,
  "rotation" | "opacity" | "stroke" | "strokeWidth" | "radius"
>;
type TextOpts = Pick<
  SlideElement,
  "font" | "size" | "align" | "color" | "rotation" | "opacity"
>;
type IconOpts = Pick<SlideElement, "rotation" | "opacity" | "strokeWidth">;

/** Height in percent that makes a box of width `w` percent square on a 16:9 canvas. */
export const sq = (w: number) => Math.round(((w * 16) / 9) * 100) / 100;

export const shape = (
  id: string,
  kind: ShapeKind,
  [x, y, w, h]: Box,
  color: string,
  opts: ShapeOpts = {},
): SlideElement => ({
  id,
  type: "shape",
  x,
  y,
  w,
  h,
  shape: kind,
  color,
  ...opts,
});

export const text = (
  id: string,
  [x, y, w, h]: Box,
  html: string,
  opts: TextOpts = {},
): SlideElement => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  html,
  ...opts,
});

/** A square icon `w` percent wide; colour falls back to the theme accent when omitted. */
export const icon = (
  id: string,
  name: string,
  x: number,
  y: number,
  w: number,
  color?: string,
  opts: IconOpts = {},
): SlideElement => ({
  id,
  type: "icon",
  x,
  y,
  w,
  h: sq(w),
  icon: name,
  ...(color ? { color } : {}),
  ...opts,
});

export const chart = (
  id: string,
  kind: ChartKind,
  [x, y, w, h]: Box,
  labels: string[],
  values: number[],
  color?: string,
): SlideElement => ({
  id,
  type: "chart",
  x,
  y,
  w,
  h,
  chart: { kind, labels, values },
  ...(color ? { color } : {}),
});

export const slide = (s: {
  id: string;
  layout: Layout;
  notes: string;
  html?: Record<string, string>;
  elements?: SlideElement[];
  background?: string;
}): Slide => ({
  id: s.id,
  layout: s.layout,
  notes: s.notes,
  html: s.html ?? {},
  elements: s.elements ?? [],
  ...(s.background ? { background: s.background } : {}),
});

/** TipTap paragraphs. */
export const p = (...lines: string[]) =>
  lines.map((l) => `<p>${l}</p>`).join("");
export const pc = (...lines: string[]) =>
  lines.map((l) => `<p style="text-align: center">${l}</p>`).join("");
export const ul = (...items: string[]) =>
  `<ul>${items.map((i) => `<li><p>${i}</p></li>`).join("")}</ul>`;
export const ol = (...items: string[]) =>
  `<ol>${items.map((i) => `<li><p>${i}</p></li>`).join("")}</ol>`;
export const accent = (s: string) =>
  `<span style="color: var(--sl-accent)">${s}</span>`;

/** Small mono label, usually above a heading. */
export const kicker = (
  id: string,
  box: Box,
  s: string,
  color = "accent",
  size = 18,
): SlideElement => text(id, box, p(s), { font: "mono", size, color });

/** One paragraph in the theme's title face. */
export const heading = (
  id: string,
  box: Box,
  s: string,
  size = 52,
  opts: TextOpts = {},
): SlideElement => text(id, box, p(s), { font: "title", size, ...opts });

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * A table as plain elements: the first row is a mono header with a rule under it, later rows can sit on
 * alternating bands. `widths` are relative column widths.
 */
export function table(
  id: string,
  [x, y, w]: [number, number, number],
  widths: number[],
  rows: string[][],
  o: { rowH?: number; size?: number; band?: string; head?: string } = {},
): SlideElement[] {
  const { rowH = 8, size = 20, band, head = "accent" } = o;
  const total = widths.reduce((a, b) => a + b, 0);
  const out: SlideElement[] = [];
  rows.forEach((cells, r) => {
    const top = y + r * rowH;
    if (r === 0)
      out.push(
        shape(`${id}-r0`, "rect", [x, r2(top + rowH - 0.4), w, 0.4], head),
      );
    else if (band && r % 2 === 0)
      out.push(shape(`${id}-r${r}`, "rect", [x, r2(top), w, rowH], band));
    let left = x;
    cells.forEach((c, i) => {
      const cw = (widths[i] / total) * w;
      const box: Box = [
        r2(left + 0.8),
        r2(top + rowH * 0.18),
        r2(cw - 1.6),
        r2(rowH * 0.72),
      ];
      out.push(
        r === 0
          ? text(`${id}-${r}-${i}`, box, p(c), {
              font: "mono",
              size: size - 3,
              color: head,
            })
          : text(`${id}-${r}-${i}`, box, p(c), { size }),
      );
      left += cw;
    });
  });
  return out;
}
