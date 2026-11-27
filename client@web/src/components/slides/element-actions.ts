import type * as Y from "yjs";
import { downscaleImage } from "@/components/editor/extensions/image-drop";
import { addElement, elementField } from "@/lib/slides/deck-doc";
import { imageBox } from "@/lib/slides/geometry";
import type {
  ChartKind,
  ShapeKind,
  SlideElement,
  TextFont,
} from "@/lib/slides/model";
import { htmlToFragment } from "./editor-kit";

export interface TextPreset {
  id: string;
  label: string;
  font: TextFont;
  size: number;
  html: string;
  color?: string;
  w: number;
  h: number;
}

/** Text styles for the library: each pairs a face (from the theme or a fixed role) with a size. */
export const TEXT_PRESETS: TextPreset[] = [
  {
    id: "heading",
    label: "Heading",
    font: "title",
    size: 76,
    html: "<p>Add a heading</p>",
    w: 64,
    h: 16,
  },
  {
    id: "subheading",
    label: "Subheading",
    font: "body",
    size: 40,
    html: "<p><strong>Add a subheading</strong></p>",
    w: 54,
    h: 10,
  },
  {
    id: "body",
    label: "Body text",
    font: "body",
    size: 26,
    html: "<p>Add a little bit of body text</p>",
    w: 46,
    h: 9,
  },
  {
    id: "quote",
    label: "Quote",
    font: "serif",
    size: 44,
    html: "<p><em>A line worth quoting.</em></p>",
    w: 56,
    h: 14,
  },
  {
    id: "number",
    label: "Big number",
    font: "title",
    size: 168,
    html: "<p>87%</p>",
    color: "accent",
    w: 36,
    h: 30,
  },
  {
    id: "serif",
    label: "Serif heading",
    font: "serif",
    size: 68,
    html: "<p>Chapter one</p>",
    w: 56,
    h: 15,
  },
  {
    id: "label",
    label: "Label",
    font: "mono",
    size: 20,
    html: "<p>Small label</p>",
    color: "accent",
    w: 26,
    h: 6,
  },
];

const centered = (w: number, h: number) => ({
  x: (100 - w) / 2,
  y: (100 - h) / 2,
  w,
  h,
});

export function addTextBox(
  doc: Y.Doc,
  slideId: string,
  preset: TextPreset,
): string {
  const { font, size, color, html, w, h } = preset;
  let id = "";
  doc.transact(() => {
    id = addElement(doc, slideId, {
      type: "text",
      ...centered(w, h),
      font,
      size,
      ...(color ? { color } : {}),
    });
    htmlToFragment(html, doc.getXmlFragment(elementField(id)));
  });
  return id;
}

export function addShape(
  doc: Y.Doc,
  slideId: string,
  shape: ShapeKind,
): string {
  const sq = 22;
  const box =
    shape === "line"
      ? { ...centered(40, 2) }
      : shape === "arrow"
        ? centered(30, 14)
        : shape === "rect" || shape === "rounded" || shape === "bubble"
          ? centered(30, 28)
          : centered(sq * (720 / 1280), sq);
  return addElement(doc, slideId, {
    type: "shape",
    shape,
    ...box,
    color: "accent",
  });
}

export const addIcon = (doc: Y.Doc, slideId: string, icon: string) =>
  addElement(doc, slideId, {
    type: "icon",
    icon,
    ...centered(12 * (720 / 1280), 12),
    color: "accent",
  });

export const CHART_PRESETS: Record<
  ChartKind,
  { labels: string[]; values: number[] }
> = {
  bar: { labels: ["Q1", "Q2", "Q3", "Q4"], values: [42, 58, 71, 93] },
  line: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    values: [12, 18, 15, 26, 31, 40],
  },
  pie: { labels: ["Product", "Services", "Licensing"], values: [55, 30, 15] },
};

export const addChart = (doc: Y.Doc, slideId: string, kind: ChartKind) =>
  addElement(doc, slideId, {
    type: "chart",
    chart: { kind, ...CHART_PRESETS[kind] },
    ...centered(50, 56),
  });

export async function readImage(
  file: File,
): Promise<{ src: string; w: number; h: number }> {
  const src = await downscaleImage(file);
  const img = new Image();
  img.src = src;
  await img.decode();
  return { src, w: img.naturalWidth, h: img.naturalHeight };
}

export async function addImage(
  doc: Y.Doc,
  slideId: string,
  file: File,
): Promise<string> {
  const { src, w, h } = await readImage(file);
  return addElement(doc, slideId, { type: "image", src, ...imageBox(w, h) });
}

/** Pastes copied elements (with their text) onto a slide, nudged so copies are visible. Returns the new ids. */
export function pasteElements(
  doc: Y.Doc,
  slideId: string,
  items: SlideElement[],
): string[] {
  const ids: string[] = [];
  doc.transact(() => {
    for (const { id: _id, html, ...el } of items) {
      const id = addElement(doc, slideId, { ...el, x: el.x + 2, y: el.y + 3 });
      if (el.type === "text" && html)
        htmlToFragment(html, doc.getXmlFragment(elementField(id)));
      ids.push(id);
    }
  });
  return ids;
}

/** True when a text box has no visible text or images (fresh, or cleared). */
export function isTextBoxEmpty(doc: Y.Doc, id: string): boolean {
  const frag = doc.getXmlFragment(elementField(id));
  const xml = frag.toString();
  return !xml.includes("<image") && xml.replace(/<[^>]+>/g, "").trim() === "";
}
