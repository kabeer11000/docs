// The PDF file model stored in the documents row. Bytes live in the `blobs` collection; the row holds
// only this small JSON: page order/rotation, annotations and form values. Pure, no DOM.
import { z } from "zod";

export type Rotation = 0 | 90 | 180 | 270;
export type Point = [number, number];

/** Rectangle in page space: PDF points, origin top-left, y down, in the page's own orientation. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One page of the edited file. `src` is the page index in the blob; -1 is a blank page of `size`. */
export interface PageRef {
  id: string;
  src: number;
  rotation: Rotation;
  size?: [number, number];
}

export interface BlobInfo {
  sha256: string;
  size: number;
  pageCount: number;
}

interface Base {
  id: string;
  pageId: string;
}
export type MarkupType = "highlight" | "underline" | "strike";
export type ShapeType = "rect" | "ellipse";
export type LineType = "line" | "arrow";

export type Annotation = Base &
  (
    | { type: MarkupType; rects: Rect[]; color: string }
    | { type: "ink"; points: Point[]; color: string; width: number }
    | {
        type: ShapeType;
        rect: Rect;
        color: string;
        width: number;
        fill?: string;
      }
    | { type: LineType; from: Point; to: Point; color: string; width: number }
    | { type: "text"; rect: Rect; text: string; size: number; color: string }
    | { type: "note"; at: Point; text: string; color: string }
    | { type: "image"; rect: Rect; src: string }
    | { type: "stamp"; rect: Rect; label: string; color: string }
  );
export type AnnotationType = Annotation["type"];

export type FormValue = string | boolean | string[];

export interface PdfData {
  version: 1;
  blob: BlobInfo | null;
  pages: PageRef[];
  annotations: Annotation[];
  forms: Record<string, FormValue>;
}

export const MAX_PDF_BYTES = 15 * 1024 * 1024;
/** Letter, in points: the size of an inserted blank page when there is nothing to copy. */
export const LETTER: [number, number] = [612, 792];

/** True when the bytes look like a PDF: "%PDF-" within the first 1 KB (readers allow leading junk). */
export function isPdfBytes(bytes: Uint8Array): boolean {
  const head = bytes.subarray(0, 1024);
  for (let i = 0; i + 5 <= head.length; i++) {
    if (
      head[i] === 0x25 &&
      head[i + 1] === 0x50 &&
      head[i + 2] === 0x44 &&
      head[i + 3] === 0x46 &&
      head[i + 4] === 0x2d
    )
      return true;
  }
  return false;
}

export const newId = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** A fresh model for a blob of `pageCount` pages. */
export function initialData(blob: BlobInfo): PdfData {
  return {
    version: 1,
    blob,
    pages: Array.from({ length: blob.pageCount }, (_, src) => ({
      id: newId(),
      src,
      rotation: 0 as Rotation,
    })),
    annotations: [],
    forms: {},
  };
}

// ---------------------------------------------------------------------------------------------
// Validation: rows are written by every client and the REST API, so read them defensively.

const num = z.number().finite();
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const point = z.tuple([num, num]);
const rect = z.object({ x: num, y: num, w: num.min(0), h: num.min(0) });
const base = { id: z.string().min(1), pageId: z.string().min(1) };

const annotationSchema = z.discriminatedUnion("type", [
  z.object({
    ...base,
    type: z.enum(["highlight", "underline", "strike"]),
    rects: z.array(rect).min(1),
    color,
  }),
  z.object({
    ...base,
    type: z.literal("ink"),
    points: z.array(point).min(1),
    color,
    width: num.positive(),
  }),
  z.object({
    ...base,
    type: z.enum(["rect", "ellipse"]),
    rect,
    color,
    width: num.min(0),
    fill: color.optional(),
  }),
  z.object({
    ...base,
    type: z.enum(["line", "arrow"]),
    from: point,
    to: point,
    color,
    width: num.positive(),
  }),
  z.object({
    ...base,
    type: z.literal("text"),
    rect,
    text: z.string(),
    size: num.positive(),
    color,
  }),
  z.object({
    ...base,
    type: z.literal("note"),
    at: point,
    text: z.string(),
    color,
  }),
  // Images are data URLs (signatures, uploads); external URLs would leak readers to third parties.
  z.object({
    ...base,
    type: z.literal("image"),
    rect,
    src: z
      .string()
      .max(1_500_000)
      .regex(/^data:image\/(png|jpeg);base64,/),
  }),
  z.object({
    ...base,
    type: z.literal("stamp"),
    rect,
    label: z.string().min(1).max(40),
    color,
  }),
]);

const pageSchema = z.object({
  id: z.string().min(1),
  src: z.number().int().min(-1),
  rotation: z.union([
    z.literal(0),
    z.literal(90),
    z.literal(180),
    z.literal(270),
  ]),
  size: z.tuple([num.positive(), num.positive()]).optional(),
});

const dataSchema = z.object({
  version: z.literal(1),
  blob: z
    .object({
      sha256: z.string().regex(/^[0-9a-f]{64}$/),
      size: z.number().int().positive(),
      pageCount: z.number().int().positive(),
    })
    .nullable(),
  pages: z.array(z.unknown()),
  annotations: z.array(z.unknown()).default([]),
  forms: z
    .record(z.string(), z.union([z.string(), z.boolean(), z.array(z.string())]))
    .default({}),
});

/**
 * The stored model, or null when the row does not hold one. Invalid pages and annotations are dropped
 * one by one so a single bad entry never hides the rest of the file.
 */
export function parsePdfData(raw: unknown): PdfData | null {
  const top = dataSchema.safeParse(raw);
  if (!top.success) return null;
  const { blob, forms } = top.data;
  const limit = blob?.pageCount ?? 0;
  const pages = top.data.pages
    .map((p) => pageSchema.safeParse(p))
    .flatMap((r) => (r.success ? [r.data as PageRef] : []))
    .filter((p) => (p.src === -1 ? !!p.size : p.src < limit));
  const pageIds = new Set(pages.map((p) => p.id));
  const annotations = top.data.annotations
    .map((a) => annotationSchema.safeParse(a))
    .flatMap((r) => (r.success ? [r.data as Annotation] : []))
    .filter((a) => pageIds.has(a.pageId));
  return { version: 1, blob, pages, annotations, forms };
}
