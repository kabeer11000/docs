import { nanoid } from "nanoid";

/**
 * Stored in `documents.data` for `kind: "slides"`:
 * { version: 1, aspect: "16:9", theme, slides: [{ id, layout, notes, html: { [region]: html } }] }
 * Slides render on a fixed 1280x720 canvas; `html` holds one TipTap HTML string per layout region.
 */
export type Theme = "paper" | "ink" | "night";
export type Layout = "title" | "title-body" | "two-column" | "section" | "image" | "blank";

export interface Slide {
  id: string;
  layout: Layout;
  notes: string;
  html: Record<string, string>;
}

export interface Deck {
  version: 1;
  aspect: "16:9";
  theme: Theme;
  slides: Slide[];
}

export const LAYOUTS: Record<Layout, { label: string; regions: readonly string[] }> = {
  title: { label: "Title", regions: ["title", "subtitle"] },
  "title-body": { label: "Title and body", regions: ["title", "body"] },
  "two-column": { label: "Two columns", regions: ["title", "left", "right"] },
  section: { label: "Section", regions: ["title"] },
  image: { label: "Image", regions: ["title", "image"] },
  blank: { label: "Blank", regions: ["body"] },
};

export const THEMES: Record<Theme, { label: string; bg: string; fg: string; accent: string }> = {
  paper: { label: "Paper", bg: "#FFFFFF", fg: "#1E2227", accent: "#2340B8" },
  ink: { label: "Ink", bg: "#1B2A78", fg: "#F3F5FF", accent: "#FFE36B" },
  night: { label: "Night", bg: "#141619", fg: "#E7E9EC", accent: "#8BA2FF" },
};

/** Every region name any layout uses (a slide keeps content for regions its current layout hides). */
export const ALL_REGIONS = [...new Set(Object.values(LAYOUTS).flatMap((l) => l.regions))];

export const isLayout = (v: unknown): v is Layout => typeof v === "string" && v in LAYOUTS;
export const isTheme = (v: unknown): v is Theme => typeof v === "string" && v in THEMES;

export const newSlideId = () => nanoid(10);

export const newSlide = (layout: Layout = "title-body"): Slide => ({ id: newSlideId(), layout, notes: "", html: {} });

/** Any stored value (null, older or hand-edited shapes) as a valid deck with at least one slide. */
export function normalizeDeck(data: unknown): Deck {
  const raw = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
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
      for (const [k, v] of Object.entries(s.html)) if (typeof v === "string") html[k] = v;
    }
    slides.push({ id, layout: isLayout(s.layout) ? s.layout : "title-body", notes: typeof s.notes === "string" ? s.notes : "", html });
  }
  return {
    version: 1,
    aspect: "16:9",
    theme: isTheme(raw.theme) ? raw.theme : "paper",
    slides: slides.length ? slides : [newSlide("title")],
  };
}
