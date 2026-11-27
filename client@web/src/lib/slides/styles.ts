import { type FontRole, type Layout, THEMES } from "./model";

export const SLIDE_W = 1280;
export const SLIDE_H = 720;

export interface RegionBox {
  /** Box in canvas pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Font size in canvas pixels. */
  size: number;
  /** Title regions use the theme's title face and weight. */
  font: "title" | "body";
  valign?: "top" | "middle" | "bottom";
  align?: "left" | "center";
  color?: "accent";
  dim?: boolean;
  italic?: boolean;
}

const M = 96;
const FULL = SLIDE_W - 2 * M;
const HEAD: RegionBox = {
  x: M,
  y: 64,
  w: FULL,
  h: 120,
  size: 52,
  font: "title",
  valign: "bottom",
};
const BODY: RegionBox = {
  x: M,
  y: 216,
  w: FULL,
  h: 440,
  size: 28,
  font: "body",
};
const col = (i: number, n: number, gap = 32): RegionBox => {
  const w = (FULL - gap * (n - 1)) / n;
  return { ...BODY, x: M + i * (w + gap), w, size: n > 2 ? 24 : 28 };
};

/**
 * Where every region of every layout sits. One table feeds the slide stylesheet (editor, filmstrip,
 * present mode, print, HTML export) and the PowerPoint export, so they always agree.
 */
export const GEOMETRY: Record<Layout, Record<string, RegionBox>> = {
  title: {
    title: {
      x: M,
      y: 150,
      w: FULL,
      h: 300,
      size: 76,
      font: "title",
      valign: "bottom",
    },
    subtitle: {
      x: M,
      y: 478,
      w: FULL,
      h: 160,
      size: 30,
      font: "body",
      dim: true,
    },
  },
  "title-body": { title: HEAD, body: BODY },
  "two-column": { title: HEAD, left: col(0, 2), right: col(1, 2) },
  "three-column": {
    title: HEAD,
    left: col(0, 3),
    middle: col(1, 3),
    right: col(2, 3),
  },
  section: {
    title: { x: M, y: 280, w: FULL, h: 340, size: 64, font: "title" },
  },
  agenda: { title: HEAD, body: { ...BODY, size: 32 } },
  "big-number": {
    stat: {
      x: M,
      y: 96,
      w: FULL,
      h: 340,
      size: 210,
      font: "title",
      valign: "bottom",
      color: "accent",
    },
    caption: { x: M, y: 462, w: FULL, h: 180, size: 34, font: "body" },
  },
  quote: {
    quote: {
      x: 176,
      y: 150,
      w: 928,
      h: 330,
      size: 46,
      font: "title",
      valign: "middle",
      italic: true,
    },
    attribution: {
      x: 176,
      y: 512,
      w: 928,
      h: 80,
      size: 26,
      font: "body",
      dim: true,
    },
  },
  image: { title: HEAD, image: BODY },
  "image-caption": {
    image: { x: M, y: 56, w: FULL, h: 528, size: 28, font: "body" },
    caption: {
      x: M,
      y: 604,
      w: FULL,
      h: 72,
      size: 24,
      font: "body",
      align: "center",
      dim: true,
    },
  },
  blank: {
    body: { x: M, y: 64, w: FULL, h: SLIDE_H - 128, size: 28, font: "body" },
  },
};

export const FONT_STACK: Record<FontRole, string> = {
  display:
    'var(--font-display-face,"Bricolage Grotesque"),var(--font-ui,Figtree),system-ui,sans-serif',
  sans: 'var(--font-ui,Figtree),system-ui,-apple-system,"Segoe UI",sans-serif',
  serif: 'Georgia,"Iowan Old Style","Times New Roman",serif',
  mono: 'ui-monospace,"SFMono-Regular",Consolas,"Liberation Mono",monospace',
};

const themeVars = Object.entries(THEMES)
  .map(
    ([name, t]) =>
      `.sl[data-theme="${name}"]{--sl-bg:${t.bg};--sl-fg:${t.fg};--sl-accent:${t.accent};--sl-title-font:${FONT_STACK[t.title]};--sl-body-font:${FONT_STACK[t.body]};--sl-title-weight:${t.weight}}`,
  )
  .join("");

const JUSTIFY = {
  top: "flex-start",
  middle: "center",
  bottom: "flex-end",
} as const;

function regionCss(layout: string, region: string, b: RegionBox) {
  const rules = [
    `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;font-size:${b.size}px`,
    `justify-content:${JUSTIFY[b.valign ?? "top"]}`,
    b.font === "title"
      ? `font-family:var(--sl-title-font);font-weight:var(--sl-title-weight);line-height:${b.size > 100 ? 0.95 : 1.08};letter-spacing:-0.02em`
      : "",
    b.align === "center" ? "text-align:center" : "",
    b.color === "accent" ? "color:var(--sl-accent)" : "",
    b.dim ? "opacity:.72" : "",
    b.italic ? "font-style:italic" : "",
  ].filter(Boolean);
  return `.sl[data-layout="${layout}"] .sl-r[data-region="${region}"]{${rules.join(";")}}`;
}

const layoutCss = Object.entries(GEOMETRY)
  .flatMap(([layout, regions]) =>
    Object.entries(regions).map(([region, box]) =>
      regionCss(layout, region, box),
    ),
  )
  .join("\n");

/**
 * One stylesheet for every place a slide renders, so they always match.
 * Markup: .sl[data-theme][data-layout] > .sl-r[data-region] > content, then .sl-el free elements.
 */
export const SLIDE_CSS = [
  `.sl{position:relative;width:${SLIDE_W}px;height:${SLIDE_H}px;overflow:hidden;background:var(--sl-bg);color:var(--sl-fg);font-family:var(--sl-body-font);font-size:28px;line-height:1.4;text-align:left;-webkit-print-color-adjust:exact;print-color-adjust:exact}`,
  themeVars,
  ".sl-r{position:absolute;display:flex;flex-direction:column;overflow:hidden;overflow-wrap:break-word}",
  ".sl-r>*{outline:none;min-height:1.2em}",
  ".sl p{margin:0 0 .45em}.sl p:last-child{margin-bottom:0}",
  ".sl ul,.sl ol{margin:0 0 .45em;padding-left:1.15em}.sl li p{margin:0 0 .2em}.sl ul{list-style:disc}.sl ol{list-style:decimal}",
  ".sl li::marker{color:var(--sl-accent)}",
  ".sl blockquote{margin:0;padding-left:.8em;border-left:3px solid var(--sl-accent)}",
  ".sl code{font-family:ui-monospace,monospace;font-size:.85em}",
  ".sl a{color:var(--sl-accent);text-decoration:underline}",
  ".sl img{display:block;max-width:100%;max-height:100%;object-fit:contain;margin:0 auto}",
  '.sl-r:has(>[contenteditable="true"]):hover{outline:1.5px dashed color-mix(in srgb,var(--sl-fg) 28%,transparent);outline-offset:6px;border-radius:2px}.sl-r:has(>[contenteditable="true"]:focus){outline:1.5px solid color-mix(in srgb,var(--sl-accent) 70%,transparent);outline-offset:6px}',
  ".sl p.is-editor-empty:first-child::before{content:attr(data-placeholder);float:left;height:0;pointer-events:none;opacity:.38}",
  layoutCss,
  // Decorations per layout.
  `.sl[data-layout="section"]::before{content:"";position:absolute;left:${M}px;top:250px;width:72px;height:6px;border-radius:3px;background:var(--sl-accent)}`,
  `.sl[data-layout="quote"]::before{content:"\\201C";position:absolute;left:${M - 8}px;top:40px;font-family:Georgia,serif;font-size:220px;line-height:1;color:var(--sl-accent)}`,
  `.sl[data-layout="big-number"]::after{content:"";position:absolute;left:${M}px;top:450px;width:96px;height:6px;border-radius:3px;background:var(--sl-fg);opacity:.15}`,
  // Agenda: every line of the body is a numbered item.
  '.sl[data-layout="agenda"] .sl-r[data-region="body"]>*{counter-reset:ag}',
  '.sl[data-layout="agenda"] .sl-r[data-region="body"] p{counter-increment:ag;padding:.3em 0;margin:0;border-bottom:1px solid color-mix(in srgb,var(--sl-fg) 14%,transparent)}',
  '.sl[data-layout="agenda"] .sl-r[data-region="body"] p::before{content:counter(ag,decimal-leading-zero);display:inline-block;width:2.2em;font-family:var(--sl-title-font);font-weight:var(--sl-title-weight);color:var(--sl-accent)}',
  '.sl[data-layout="agenda"] .sl-r[data-region="body"] p.is-editor-empty:first-child::before{content:attr(data-placeholder);width:auto;font:inherit;color:inherit}',
  '.sl-r[data-region="image"]>*{height:100%;display:flex;flex-direction:column;justify-content:center}.sl-r[data-region="image"] img{min-height:0}',
  // Free elements: absolutely placed in percent of the canvas.
  ".sl-el{position:absolute;overflow:visible}",
  ".sl-el>img{width:100%;height:100%;max-height:none;object-fit:contain;margin:0;user-select:none;-webkit-user-drag:none}",
  ".sl-el-text{overflow-wrap:break-word}.sl-el-text>*{outline:none;min-height:1.2em}",
].join("\n");
