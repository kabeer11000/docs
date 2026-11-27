import { nanoid } from "nanoid";

/**
 * Stored in `documents.data` for `kind: "slides"`:
 * { version: 1, aspect: "16:9", theme, transition, slides: [{ id, layout, notes, html: { [region]: html }, elements }] }
 * Slides render on a fixed 1280x720 canvas; `html` holds one TipTap HTML string per layout region.
 * `elements` are freely placed images and text boxes, positioned in percent of the canvas.
 */
export type Theme =
  | "paper"
  | "ink"
  | "night"
  | "tangerine"
  | "editorial"
  | "lemon"
  | "forest"
  | "blush";
export type Layout =
  | "title"
  | "title-body"
  | "two-column"
  | "three-column"
  | "section"
  | "agenda"
  | "big-number"
  | "quote"
  | "image"
  | "image-caption"
  | "blank";
export type Transition = "none" | "fade" | "slide" | "zoom";

export type ElementType = "image" | "text" | "shape" | "icon" | "chart";
export type ShapeKind =
  | "rect"
  | "rounded"
  | "circle"
  | "triangle"
  | "line"
  | "arrow"
  | "star"
  | "bubble";
export type ChartKind = "bar" | "line" | "pie";
/** A colour: "#RRGGBB" / "#RRGGBBAA", a theme colour ("accent" | "fg" | "bg"), or "none". */
export type Paint = string;
export type TextFont = "title" | "body" | FontRole;

export interface ChartData {
  kind: ChartKind;
  labels: string[];
  values: number[];
}

export interface SlideElement {
  id: string;
  type: ElementType;
  /** Box in percent of the 1280x720 canvas. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees clockwise. */
  rotation?: number;
  /** 0 to 1 (absent = opaque). */
  opacity?: number;
  locked?: boolean;
  /** image */
  src?: string;
  /** image: "cover" crops to fill the box (default: fit inside). */
  fit?: "cover";
  /** text */
  html?: string;
  font?: TextFont;
  /** Text size in canvas pixels. */
  size?: number;
  align?: "left" | "center" | "right";
  /** Text, icon and chart colour; shape fill. */
  color?: Paint;
  /** shape */
  shape?: ShapeKind;
  stroke?: Paint;
  strokeWidth?: number;
  radius?: number;
  /** icon: a key of ICON_NODES */
  icon?: string;
  chart?: ChartData;
}

export interface Slide {
  id: string;
  layout: Layout;
  notes: string;
  html: Record<string, string>;
  elements: SlideElement[];
  /** Background override: a key of BACKGROUNDS or "#RRGGBB". Absent = the theme's. */
  background?: string;
}

export interface Deck {
  version: 1;
  aspect: "16:9";
  theme: Theme;
  transition: Transition;
  slides: Slide[];
}

export const LAYOUTS: Record<
  Layout,
  { label: string; regions: readonly string[] }
> = {
  title: { label: "Title", regions: ["title", "subtitle"] },
  "title-body": { label: "Title and body", regions: ["title", "body"] },
  "two-column": { label: "Two columns", regions: ["title", "left", "right"] },
  "three-column": {
    label: "Three columns",
    regions: ["title", "left", "middle", "right"],
  },
  section: { label: "Section", regions: ["title"] },
  agenda: { label: "Agenda", regions: ["title", "body"] },
  "big-number": { label: "Big number", regions: ["stat", "caption"] },
  quote: { label: "Quote", regions: ["quote", "attribution"] },
  image: { label: "Image", regions: ["title", "image"] },
  "image-caption": {
    label: "Image and caption",
    regions: ["image", "caption"],
  },
  blank: { label: "Blank", regions: ["body"] },
};

export type FontRole = "display" | "sans" | "serif" | "mono";

export interface ThemeDef {
  label: string;
  bg: string;
  fg: string;
  accent: string;
  title: FontRole;
  body: FontRole;
  /** Title weight; editorial serif reads better lighter. */
  weight: number;
}

export const THEMES: Record<Theme, ThemeDef> = {
  paper: {
    label: "Studio",
    bg: "#FFFFFF",
    fg: "#121418",
    accent: "#FF6A1F",
    title: "display",
    body: "sans",
    weight: 700,
  },
  ink: {
    label: "Cobalt",
    bg: "#2337C6",
    fg: "#F3F5FF",
    accent: "#FFE45C",
    title: "display",
    body: "sans",
    weight: 700,
  },
  night: {
    label: "Night",
    bg: "#0E1014",
    fg: "#F1F3F7",
    accent: "#FF9257",
    title: "display",
    body: "sans",
    weight: 650,
  },
  tangerine: {
    label: "Tangerine",
    bg: "#FF6A1F",
    fg: "#1C0D04",
    accent: "#FFFFFF",
    title: "display",
    body: "sans",
    weight: 800,
  },
  editorial: {
    label: "Editorial",
    bg: "#FBFAF8",
    fg: "#141414",
    accent: "#D7261E",
    title: "serif",
    body: "sans",
    weight: 500,
  },
  lemon: {
    label: "Lemon",
    bg: "#FFE45C",
    fg: "#121418",
    accent: "#3B5BFD",
    title: "display",
    body: "sans",
    weight: 800,
  },
  forest: {
    label: "Forest",
    bg: "#0F3B2C",
    fg: "#EAF4EE",
    accent: "#7FE0A8",
    title: "serif",
    body: "sans",
    weight: 500,
  },
  blush: {
    label: "Blush",
    bg: "#FFE9E2",
    fg: "#3A0F22",
    accent: "#E0457B",
    title: "mono",
    body: "sans",
    weight: 600,
  },
};

export const TRANSITIONS: Record<Transition, string> = {
  none: "None",
  fade: "Fade",
  slide: "Slide",
  zoom: "Zoom",
};

/** Every region name any layout uses (a slide keeps content for regions its current layout hides). */
export const ALL_REGIONS = [
  ...new Set(Object.values(LAYOUTS).flatMap((l) => l.regions)),
];

export const isLayout = (v: unknown): v is Layout =>
  typeof v === "string" && v in LAYOUTS;
export const isTheme = (v: unknown): v is Theme =>
  typeof v === "string" && v in THEMES;
export const isTransition = (v: unknown): v is Transition =>
  typeof v === "string" && v in TRANSITIONS;

/** Image sources a slide may show: inline data images or https. */
export const isSafeImageSrc = (v: unknown): v is string =>
  typeof v === "string" && /^(data:image\/[\w.+-]+;|https:\/\/)/i.test(v);

export const newSlideId = () => nanoid(10);

export const newSlide = (layout: Layout = "title-body"): Slide => ({
  id: newSlideId(),
  layout,
  notes: "",
  html: {},
  elements: [],
});

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));
const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

export const THEME_PAINTS = ["accent", "fg", "bg", "none"] as const;
/** Theme colours or plain hex only, so a paint is always safe to put in markup. */
export const isPaint = (v: unknown): v is Paint =>
  typeof v === "string" &&
  ((THEME_PAINTS as readonly string[]).includes(v) ||
    /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(v));

export const SHAPES: Record<ShapeKind, string> = {
  rect: "Rectangle",
  rounded: "Rounded rectangle",
  circle: "Circle",
  triangle: "Triangle",
  line: "Line",
  arrow: "Arrow",
  star: "Star",
  bubble: "Speech bubble",
};
const CHART_KINDS: ChartKind[] = ["bar", "line", "pie"];
const TEXT_FONTS: TextFont[] = [
  "title",
  "body",
  "display",
  "sans",
  "serif",
  "mono",
];

/** Slide background presets. `css` may use the slide's theme variables; `base` is the flat colour for PowerPoint. */
export const BACKGROUNDS: Record<
  string,
  { label: string; css: string; base: Paint }
> = {
  "grad-sunset": {
    label: "Sunset",
    css: "linear-gradient(135deg,#FF6A1F 0%,#FF3D7F 100%)",
    base: "#FF5250",
  },
  "grad-ocean": {
    label: "Ocean",
    css: "linear-gradient(135deg,#1A2A80 0%,#3B5BFD 55%,#5FD3F3 100%)",
    base: "#2F4BD0",
  },
  "grad-mint": {
    label: "Mint",
    css: "linear-gradient(160deg,#E9FBF2 0%,#B7F0D3 100%)",
    base: "#CFF6E2",
  },
  "grad-dusk": {
    label: "Dusk",
    css: "linear-gradient(160deg,#1B1035 0%,#4A1F6B 60%,#B4436C 100%)",
    base: "#3A1A55",
  },
  "grad-peach": {
    label: "Peach",
    css: "linear-gradient(135deg,#FFF1E6 0%,#FFD3B8 100%)",
    base: "#FFE1CF",
  },
  "grad-lime": {
    label: "Lime",
    css: "linear-gradient(135deg,#F4FF7A 0%,#7AF0A0 100%)",
    base: "#B8F88D",
  },
  "grad-night": {
    label: "Midnight",
    css: "radial-gradient(120% 120% at 20% 0%,#2A3350 0%,#0E1014 60%)",
    base: "#141826",
  },
  "grad-accent": {
    label: "Theme glow",
    css: "radial-gradient(90% 120% at 100% 100%,color-mix(in srgb,var(--sl-accent) 45%,var(--sl-bg)) 0%,var(--sl-bg) 70%)",
    base: "bg",
  },
  "pat-dots": {
    label: "Dots",
    css: "radial-gradient(color-mix(in srgb,var(--sl-fg) 16%,transparent) 2px,transparent 2.5px) 0 0/32px 32px,var(--sl-bg)",
    base: "bg",
  },
  "pat-grid": {
    label: "Grid",
    css: "linear-gradient(color-mix(in srgb,var(--sl-fg) 8%,transparent) 1px,transparent 1px) 0 0/48px 48px,linear-gradient(90deg,color-mix(in srgb,var(--sl-fg) 8%,transparent) 1px,transparent 1px) 0 0/48px 48px,var(--sl-bg)",
    base: "bg",
  },
  "pat-stripes": {
    label: "Stripes",
    css: "repeating-linear-gradient(135deg,color-mix(in srgb,var(--sl-fg) 6%,transparent) 0 14px,transparent 14px 28px),var(--sl-bg)",
    base: "bg",
  },
  "pat-band": {
    label: "Accent band",
    css: "linear-gradient(90deg,var(--sl-accent) 0 28%,var(--sl-bg) 28% 100%)",
    base: "bg",
  },
};

export const isBackground = (v: unknown): v is string =>
  typeof v === "string" && (v in BACKGROUNDS || /^#[0-9a-f]{6}$/i.test(v));

const pick = <T extends string>(
  v: unknown,
  allowed: readonly T[],
): T | undefined =>
  typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : undefined;

function normalizeChart(v: unknown): ChartData | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Record<string, unknown>;
  const labels = (Array.isArray(c.labels) ? c.labels : [])
    .slice(0, 24)
    .map((l) => String(l ?? "").slice(0, 40));
  const values = (Array.isArray(c.values) ? c.values : [])
    .slice(0, labels.length)
    .map((n) => num(Number(n), 0));
  while (values.length < labels.length) values.push(0);
  return labels.length
    ? { kind: pick(c.kind, CHART_KINDS) ?? "bar", labels, values }
    : null;
}

/** Drops undefined keys so stored elements stay small and compare equal. */
const compact = (o: SlideElement): SlideElement =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined),
  ) as unknown as SlideElement;

/** A stored element as a valid one, or null. Boxes are clamped to stay (at least partly) on the slide. */
export function normalizeElement(data: unknown): SlideElement | null {
  if (!data || typeof data !== "object") return null;
  const e = data as Record<string, unknown>;
  const w = clamp(num(e.w, 30), 0.2, 200);
  const h = clamp(num(e.h, 20), 0.2, 200);
  const common = {
    id: typeof e.id === "string" && e.id ? e.id : newSlideId(),
    x: clamp(num(e.x, 0), -w + 1, 99),
    y: clamp(num(e.y, 0), -h + 1, 99),
    w,
    h,
    rotation:
      typeof e.rotation === "number" &&
      Number.isFinite(e.rotation) &&
      e.rotation % 360 !== 0
        ? e.rotation % 360
        : undefined,
    opacity:
      typeof e.opacity === "number" && e.opacity >= 0 && e.opacity < 1
        ? e.opacity
        : undefined,
    locked: e.locked === true ? true : undefined,
  };
  const color = isPaint(e.color) ? e.color : undefined;
  switch (e.type) {
    case "image":
      return isSafeImageSrc(e.src)
        ? compact({
            ...common,
            type: "image",
            src: e.src,
            fit: e.fit === "cover" ? "cover" : undefined,
          })
        : null;
    case "text":
      return compact({
        ...common,
        type: "text",
        html: typeof e.html === "string" ? e.html : "",
        font: pick(e.font, TEXT_FONTS),
        size:
          typeof e.size === "number" && e.size >= 6 && e.size <= 400
            ? e.size
            : undefined,
        align: pick(e.align, ["left", "center", "right"] as const),
        color,
      });
    case "shape": {
      const shape = pick(e.shape, Object.keys(SHAPES) as ShapeKind[]);
      if (!shape) return null;
      return compact({
        ...common,
        type: "shape",
        shape,
        color: color ?? "accent",
        stroke: isPaint(e.stroke) ? e.stroke : undefined,
        strokeWidth:
          typeof e.strokeWidth === "number"
            ? clamp(e.strokeWidth, 0, 64)
            : undefined,
        radius:
          typeof e.radius === "number" ? clamp(e.radius, 0, 360) : undefined,
      });
    }
    case "icon":
      return typeof e.icon === "string" && /^[a-z0-9-]{1,40}$/.test(e.icon)
        ? compact({
            ...common,
            type: "icon",
            icon: e.icon,
            color,
            strokeWidth:
              typeof e.strokeWidth === "number"
                ? clamp(e.strokeWidth, 0.5, 4)
                : undefined,
          })
        : null;
    case "chart": {
      const chart = normalizeChart(e.chart);
      return chart ? compact({ ...common, type: "chart", chart, color }) : null;
    }
    default:
      return null;
  }
}

/** Any stored value (null, older or hand-edited shapes) as a valid deck with at least one slide. */
export function normalizeDeck(data: unknown): Deck {
  const raw = (data && typeof data === "object" ? data : {}) as Record<
    string,
    unknown
  >;
  const seen = new Set<string>();
  const slides: Slide[] = [];
  for (const item of Array.isArray(raw.slides) ? raw.slides : []) {
    if (!item || typeof item !== "object") continue;
    const s = item as Record<string, unknown>;
    let id = typeof s.id === "string" && s.id ? s.id : newSlideId();
    if (seen.has(id)) id = newSlideId();
    seen.add(id);
    const html: Record<string, string> = {};
    if (s.html && typeof s.html === "object") {
      for (const [k, v] of Object.entries(s.html))
        if (typeof v === "string") html[k] = v;
    }
    // Decks saved before free placement have no elements.
    const elements: SlideElement[] = [];
    for (const e of Array.isArray(s.elements) ? s.elements : []) {
      const el = normalizeElement(e);
      if (!el) continue;
      if (seen.has(el.id)) el.id = newSlideId();
      seen.add(el.id);
      elements.push(el);
    }
    slides.push({
      id,
      layout: isLayout(s.layout) ? s.layout : "title-body",
      notes: typeof s.notes === "string" ? s.notes : "",
      html,
      elements,
      ...(isBackground(s.background) ? { background: s.background } : {}),
    });
  }
  return {
    version: 1,
    aspect: "16:9",
    theme: isTheme(raw.theme) ? raw.theme : "paper",
    transition: isTransition(raw.transition) ? raw.transition : "none",
    slides: slides.length ? slides : [newSlide("title")],
  };
}

const sameValue = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) =>
    sameValue(
      (a as Record<string, unknown>)[k],
      (b as Record<string, unknown>)[k],
    ),
  );
};

/** Deep equality for two slides (plain data only). */
export const sameSlide = (a: Slide, b: Slide) => sameValue(a, b);
