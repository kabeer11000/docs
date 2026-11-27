import type PptxGenJS from "pptxgenjs";
import { backgroundHex, hasIcon, iconSvg, paintHex } from "./elements";
import {
  type ChartKind,
  type Deck,
  type FontRole,
  isSafeImageSrc,
  LAYOUTS,
  type ShapeKind,
  type Slide,
  type SlideElement,
  THEMES,
  type ThemeDef,
} from "./model";
import { GEOMETRY, type RegionBox, SLIDE_H, SLIDE_W } from "./styles";

/**
 * PowerPoint export as pure mapping: deck -> plain slide specs (tested), then a thin pass that feeds the specs
 * to pptxgenjs. Canvas pixels map to inches at 96 px/in (1280x720 -> 13.33x7.5in, PowerPoint's 16:9),
 * so font sizes map at 0.75 pt/px.
 */

export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  /** RRGGBB, no hash. */
  color?: string;
  link?: string;
}

export interface Para {
  runs: Run[];
  bullet?: "bullet" | "number";
  align?: "left" | "center" | "right";
}

export interface InchBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type SpecItem = Placed &
  (
    | {
        kind: "text";
        box: InchBox;
        paras: Para[];
        fontFace: string;
        fontSize: number;
        color: string;
        bold: boolean;
        italic: boolean;
        valign: "top" | "middle" | "bottom";
        align: "left" | "center" | "right";
      }
    | { kind: "image"; box: InchBox; src: string }
    | {
        kind: "shape";
        /** pptxgenjs shape name */
        shape: string;
        box: InchBox;
        fill: string | null;
        line: { color: string; width: number } | null;
        radius?: number;
      }
    | {
        kind: "chart";
        chart: ChartKind;
        box: InchBox;
        labels: string[];
        values: number[];
        colors: string[];
        textColor: string;
      }
  );

export interface SlideSpec {
  background: string;
  notes: string;
  items: SpecItem[];
}

export const PPTX_FONT: Record<FontRole, string> = {
  display: "Arial",
  sans: "Arial",
  serif: "Georgia",
  mono: "Courier New",
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
};
export const decodeEntities = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code =
        e[1] === "x" || e[1] === "X"
          ? Number.parseInt(e.slice(2), 16)
          : Number.parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });

const hex = (s: string) => s.replace(/^#/, "").toUpperCase();
const attr = (attrs: string, name: string) => {
  const m = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i").exec(attrs);
  return m ? decodeEntities(m[1]) : undefined;
};

/** A CSS colour from the editor (hex, rgb(), or the theme accent variable) as RRGGBB. */
export function cssColor(value: string, theme: ThemeDef): string | undefined {
  const v = value.trim();
  if (/var\(--sl-accent\)/.test(v)) return hex(theme.accent);
  const h = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(v)?.[1];
  if (h)
    return (
      h.length === 3 ? [...h].map((c) => c + c).join("") : h
    ).toUpperCase();
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(v);
  if (rgb)
    return rgb
      .slice(1, 4)
      .map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  return undefined;
}

/** Blends two RRGGBB colours; `t` is the weight of `a`. */
export function mix(a: string, b: string, t: number): string {
  const ch = (c: string, i: number) =>
    Number.parseInt(hex(c).slice(i, i + 2), 16);
  return [0, 2, 4]
    .map((i) =>
      Math.round(ch(a, i) * t + ch(b, i) * (1 - t))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase();
}

/**
 * The editor's HTML (a small, schema-generated tag set) as paragraphs of formatted runs, plus image sources.
 * A tokenizer, not a DOM, so it runs anywhere (server, tests).
 */
export function htmlToParas(
  html: string,
  theme: ThemeDef,
): { paras: Para[]; images: string[] } {
  const paras: Para[] = [];
  const images: string[] = [];
  const lists: ("bullet" | "number")[] = [];
  const marks: { tag: string; run: Partial<Run> }[] = [];
  const cur: { p: Para | null } = { p: null };

  const open = (align?: Para["align"]) => {
    const p: Para = {
      runs: [],
      ...(lists.length ? { bullet: lists[lists.length - 1] } : {}),
      ...(align ? { align } : {}),
    };
    paras.push(p);
    cur.p = p;
    return p;
  };

  for (const m of html.matchAll(/<(\/?)([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g)) {
    const [, close, rawTag, attrs = "", text] = m;
    if (text !== undefined) {
      const t = decodeEntities(text);
      if (!t) continue;
      const run: Run = { text: t };
      for (const mk of marks) Object.assign(run, mk.run);
      (cur.p ?? open()).runs.push(run);
      continue;
    }
    const tag = rawTag.toLowerCase();
    if (close) {
      if (tag === "ul" || tag === "ol") lists.pop();
      else if (tag === "p" || tag === "li" || tag === "blockquote")
        cur.p = null;
      else {
        const i = marks.map((x) => x.tag).lastIndexOf(tag);
        if (i >= 0) marks.splice(i, 1);
      }
      continue;
    }
    switch (tag) {
      case "ul":
      case "ol":
        lists.push(tag === "ul" ? "bullet" : "number");
        break;
      case "p": {
        const align = /text-align:\s*(left|center|right)/i.exec(
          attr(attrs, "style") ?? "",
        )?.[1] as Para["align"];
        // A list item's first paragraph is the item itself.
        if (cur.p && !cur.p.runs.length) {
          if (align) cur.p.align = align;
        } else open(align);
        break;
      }
      case "li":
        open();
        break;
      case "br":
        open(cur.p?.align);
        break;
      case "blockquote":
        break;
      case "img": {
        const src = attr(attrs, "src");
        if (isSafeImageSrc(src)) images.push(src);
        break;
      }
      case "strong":
      case "b":
        marks.push({ tag, run: { bold: true } });
        break;
      case "em":
      case "i":
        marks.push({ tag, run: { italic: true } });
        break;
      case "u":
        marks.push({ tag, run: { underline: true } });
        break;
      case "s":
        marks.push({ tag, run: { strike: true } });
        break;
      case "a": {
        const href = attr(attrs, "href");
        marks.push({
          tag,
          run: href && /^(https?:|mailto:)/i.test(href) ? { link: href } : {},
        });
        break;
      }
      case "span": {
        const color = /(?:^|;)\s*color:\s*([^;]+)/i.exec(
          attr(attrs, "style") ?? "",
        )?.[1];
        const c = color ? cssColor(color, theme) : undefined;
        marks.push({ tag, run: c ? { color: c } : {} });
        break;
      }
      default:
        if (!/^(br|img|hr)$/.test(tag) && !attrs.trim().endsWith("/"))
          marks.push({ tag, run: {} });
    }
  }
  return {
    paras: paras.filter((p, i) => p.runs.length || i < paras.length - 1),
    images,
  };
}

const hasText = (paras: Para[]) =>
  paras.some((p) => p.runs.some((r) => r.text.trim()));
const px = (n: number) => Math.round((n / 96) * 1000) / 1000;
const inches = (b: {
  x: number;
  y: number;
  w: number;
  h: number;
}): InchBox => ({ x: px(b.x), y: px(b.y), w: px(b.w), h: px(b.h) });
const pctBox = (e: { x: number; y: number; w: number; h: number }) =>
  inches({
    x: (e.x / 100) * SLIDE_W,
    y: (e.y / 100) * SLIDE_H,
    w: (e.w / 100) * SLIDE_W,
    h: (e.h / 100) * SLIDE_H,
  });

/** The largest box with the image's aspect ratio that fits inside `box`, centred. */
export function containBox(
  box: InchBox,
  natural: { w: number; h: number } | null | undefined,
): InchBox {
  if (!natural || natural.w <= 0 || natural.h <= 0) return box;
  const k = Math.min(box.w / natural.w, box.h / natural.h);
  const w = natural.w * k;
  const h = natural.h * k;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

const PPTX_SHAPE: Record<ShapeKind, string> = {
  rect: "rect",
  rounded: "roundRect",
  circle: "ellipse",
  triangle: "triangle",
  line: "line",
  arrow: "rightArrow",
  star: "star5",
  bubble: "wedgeRoundRectCallout",
};

/** Extras every positioned item may carry. */
interface Placed {
  rotate?: number;
  /** 0-100, PowerPoint's transparency. */
  transparency?: number;
}

const placed = (el: SlideElement): Placed => ({
  ...(el.rotation ? { rotate: el.rotation } : {}),
  ...(el.opacity !== undefined
    ? { transparency: Math.round((1 - el.opacity) * 100) }
    : {}),
});

function textItem(
  paras: Para[],
  box: InchBox,
  region: RegionBox | null,
  theme: ThemeDef,
  el?: SlideElement,
): SpecItem {
  const title = region?.font === "title" || el?.font === "title";
  const fg = hex(theme.fg);
  const color = el?.color
    ? (paintHex(el.color, theme) ?? fg)
    : region?.color === "accent"
      ? hex(theme.accent)
      : region?.dim
        ? mix(fg, hex(theme.bg), 0.72)
        : fg;
  const role =
    el?.font && el.font !== "title" && el.font !== "body"
      ? el.font
      : title
        ? theme.title
        : theme.body;
  return {
    kind: "text",
    box,
    paras,
    fontFace: PPTX_FONT[role],
    fontSize: Math.round((el?.size ?? region?.size ?? 28) * 0.75 * 10) / 10,
    color,
    bold: title && theme.weight >= 600,
    italic: !!region?.italic,
    valign: region?.valign ?? "top",
    align: el?.align ?? region?.align ?? "left",
    ...(el ? placed(el) : {}),
  };
}

const base64 = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s)));

/** An icon as an SVG data URL with its colour resolved (PowerPoint knows no CSS variables). */
export function iconDataUrl(el: SlideElement, theme: ThemeDef): string {
  const color = paintHex(el.color ?? "accent", theme) ?? hex(theme.accent);
  const svg = iconSvg(el.icon ?? "", `#${color}`, el.strokeWidth).replace(
    'stroke="currentColor"',
    `stroke="#${color}"`,
  );
  return `data:image/svg+xml;base64,${base64(svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '))}`;
}

function elementItem(el: SlideElement, theme: ThemeDef): SpecItem | null {
  const box = pctBox(el);
  switch (el.type) {
    case "image":
      return isSafeImageSrc(el.src)
        ? { kind: "image", box, src: el.src, ...placed(el) }
        : null;
    case "text": {
      const { paras } = htmlToParas(el.html ?? "", theme);
      return hasText(paras) ? textItem(paras, box, null, theme, el) : null;
    }
    case "shape": {
      if (!el.shape) return null;
      const fill = paintHex(el.color ?? "accent", theme);
      const strokeW =
        el.shape === "line"
          ? (el.strokeWidth ?? 6)
          : (el.strokeWidth ?? (el.stroke && el.stroke !== "none" ? 4 : 0));
      const strokeColor =
        el.shape === "line"
          ? fill
          : el.stroke
            ? paintHex(el.stroke, theme)
            : null;
      return {
        kind: "shape",
        shape: PPTX_SHAPE[el.shape],
        // A line runs across the middle of its box.
        box: el.shape === "line" ? { ...box, y: box.y + box.h / 2, h: 0 } : box,
        fill: el.shape === "line" ? null : fill,
        line:
          strokeColor && strokeW > 0
            ? {
                color: strokeColor,
                width: Math.round(strokeW * 0.75 * 10) / 10,
              }
            : null,
        ...(el.shape === "rounded" || el.radius
          ? { radius: px(el.radius ?? Math.min(box.w, box.h) * 96 * 0.2) }
          : {}),
        ...placed(el),
      };
    }
    case "icon":
      return hasIcon(el.icon)
        ? { kind: "image", box, src: iconDataUrl(el, theme), ...placed(el) }
        : null;
    case "chart": {
      if (!el.chart) return null;
      const base = paintHex(el.color ?? "accent", theme) ?? hex(theme.accent);
      const fg = hex(theme.fg);
      const bg = hex(theme.bg);
      return {
        kind: "chart",
        chart: el.chart.kind,
        box,
        labels: el.chart.labels,
        values: el.chart.values,
        colors: [
          base,
          mix(base, fg, 0.55),
          mix(base, bg, 0.45),
          mix(fg, bg, 0.7),
          mix(base, fg, 0.25),
          mix(fg, bg, 0.35),
        ],
        textColor: fg,
        ...placed(el),
      };
    }
    default:
      return null;
  }
}

/** One slide as plain data: background, notes, and positioned text, images, shapes and charts. */
export function slideToSpec(slide: Slide, themeName: Deck["theme"]): SlideSpec {
  const theme = THEMES[themeName];
  const items: SpecItem[] = [];
  for (const region of LAYOUTS[slide.layout].regions) {
    const html = slide.html[region];
    const geo = GEOMETRY[slide.layout][region];
    if (!html || !geo) continue;
    const { paras, images } = htmlToParas(html, theme);
    const box = inches(geo);
    const text = hasText(paras);
    if (images.length && (!text || region === "image"))
      items.push({ kind: "image", box, src: images[0] });
    else if (text) {
      const numbered =
        slide.layout === "agenda" && region === "body"
          ? paras.map((p) => ({ ...p, bullet: p.bullet ?? "number" }))
          : paras;
      items.push(textItem(numbered, box, geo, theme));
    }
  }
  for (const el of slide.elements ?? []) {
    const item = elementItem(el, theme);
    if (item) items.push(item);
  }
  return {
    background: backgroundHex(slide.background, theme),
    notes: slide.notes,
    items,
  };
}

/** pptxgenjs text runs for paragraphs: paragraph options repeat on each run, the last run breaks the line. */
export function parasToRuns(paras: Para[]): PptxGenJS.TextProps[] {
  const out: PptxGenJS.TextProps[] = [];
  paras.forEach((p, pi) => {
    const runs = p.runs.length ? p.runs : [{ text: "" }];
    runs.forEach((r, ri) => {
      out.push({
        text: r.text,
        options: {
          ...(r.bold ? { bold: true } : {}),
          ...(r.italic ? { italic: true } : {}),
          ...(r.underline ? { underline: { style: "sng" as const } } : {}),
          ...(r.strike ? { strike: "sngStrike" as const } : {}),
          ...(r.color ? { color: r.color } : {}),
          ...(r.link ? { hyperlink: { url: r.link } } : {}),
          ...(p.bullet === "bullet"
            ? { bullet: true }
            : p.bullet === "number"
              ? { bullet: { type: "number" as const } }
              : {}),
          ...(p.align ? { align: p.align } : {}),
          ...(ri === runs.length - 1 && pi < paras.length - 1
            ? { breakLine: true }
            : {}),
        },
      });
    });
  });
  return out;
}

export type MeasureImage = (
  src: string,
) => Promise<{ w: number; h: number } | null>;

const CHART_TYPE = { bar: "bar", line: "line", pie: "pie" } as const;

/** Builds the presentation. `measure` (browser only) keeps images at their aspect ratio inside their boxes. */
export async function buildPptx(
  deck: Deck,
  title: string,
  Pptx: new () => PptxGenJS,
  measure?: MeasureImage,
): Promise<PptxGenJS> {
  const pptx = new Pptx();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = title || "Presentation";
  for (const slide of deck.slides) {
    const spec = slideToSpec(slide, deck.theme);
    const s = pptx.addSlide();
    s.background = { color: spec.background };
    for (const item of spec.items) {
      const extra = { ...(item.rotate ? { rotate: item.rotate } : {}) };
      if (item.kind === "image") {
        const box = containBox(
          item.box,
          measure ? await measure(item.src).catch(() => null) : null,
        );
        const src = item.src.startsWith("data:")
          ? { data: item.src }
          : { path: item.src };
        s.addImage({
          ...src,
          ...box,
          ...extra,
          ...(item.transparency ? { transparency: item.transparency } : {}),
        });
      } else if (item.kind === "shape") {
        s.addShape(item.shape as PptxGenJS.SHAPE_NAME, {
          ...item.box,
          ...extra,
          fill: item.fill
            ? { color: item.fill, transparency: item.transparency ?? 0 }
            : { type: "none" },
          line: item.line
            ? { color: item.line.color, width: item.line.width }
            : { type: "none" },
          ...(item.radius ? { rectRadius: item.radius } : {}),
        });
      } else if (item.kind === "chart") {
        s.addChart(
          CHART_TYPE[item.chart] as PptxGenJS.CHART_NAME,
          [{ name: "Series 1", labels: item.labels, values: item.values }],
          {
            ...item.box,
            chartColors: item.chart === "pie" ? item.colors : [item.colors[0]],
            showLegend: item.chart === "pie",
            legendPos: "r",
            legendColor: item.textColor,
            catAxisLabelColor: item.textColor,
            valAxisLabelColor: item.textColor,
            valAxisHidden: item.chart !== "pie",
            valGridLine: { style: "none" },
            showValue: item.chart !== "pie",
            dataLabelColor: item.textColor,
            ...(item.chart === "line"
              ? { lineSize: 3, lineDataSymbolSize: 8 }
              : {}),
          },
        );
      } else {
        s.addText(parasToRuns(item.paras), {
          ...item.box,
          ...extra,
          fontFace: item.fontFace,
          fontSize: item.fontSize,
          color: item.color,
          bold: item.bold,
          italic: item.italic,
          valign: item.valign,
          align: item.align,
          margin: 0,
          paraSpaceAfter: Math.round(item.fontSize * 0.35),
          ...(item.transparency ? { transparency: item.transparency } : {}),
        });
      }
    }
    if (spec.notes.trim()) s.addNotes(spec.notes);
  }
  return pptx;
}
