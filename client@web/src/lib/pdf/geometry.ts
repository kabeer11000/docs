// Coordinate transforms. Annotations are stored in page space: PDF points, origin top-left, y down, in
// the page's own orientation (its /Rotate applied, nothing else). On screen a page is drawn at a zoom
// with an extra clockwise rotation (the user's page rotation plus the view rotation).
import type { Point, Rect, Rotation } from "./model";

export interface Frame {
  /** Page size in page space. */
  w: number;
  h: number;
  zoom: number;
  /** Extra clockwise rotation on screen. */
  rotation: Rotation;
}

export const normRotation = (deg: number): Rotation =>
  ((((Math.round(deg / 90) * 90) % 360) + 360) % 360) as Rotation;

/** Size of the page box on screen, in CSS pixels. */
export function boxSize({ w, h, zoom, rotation }: Frame): {
  width: number;
  height: number;
} {
  return rotation % 180 === 0
    ? { width: w * zoom, height: h * zoom }
    : { width: h * zoom, height: w * zoom };
}

/** Page space to screen pixels relative to the box's top-left corner. */
export function pageToScreen(
  { w, h, zoom: z, rotation }: Frame,
  [x, y]: Point,
): Point {
  switch (rotation) {
    case 90:
      return [(h - y) * z, x * z];
    case 180:
      return [(w - x) * z, (h - y) * z];
    case 270:
      return [y * z, (w - x) * z];
    default:
      return [x * z, y * z];
  }
}

/** Screen pixels relative to the box's top-left corner to page space. */
export function screenToPage(
  { w, h, zoom: z, rotation }: Frame,
  [sx, sy]: Point,
): Point {
  const x = sx / z;
  const y = sy / z;
  switch (rotation) {
    case 90:
      return [y, h - x];
    case 180:
      return [w - x, h - y];
    case 270:
      return [w - y, x];
    default:
      return [x, y];
  }
}

/** An axis-aligned screen rectangle (relative to the box) as a page-space rectangle. */
export function screenRectToPage(
  f: Frame,
  r: { left: number; top: number; width: number; height: number },
): Rect {
  const [ax, ay] = screenToPage(f, [r.left, r.top]);
  const [bx, by] = screenToPage(f, [r.left + r.width, r.top + r.height]);
  return {
    x: Math.min(ax, bx),
    y: Math.min(ay, by),
    w: Math.abs(bx - ax),
    h: Math.abs(by - ay),
  };
}

/**
 * CSS transform that places a `w*zoom x h*zoom` layer (page space times zoom, origin top-left) into the
 * rotated box. Use with transform-origin 0 0.
 */
export function layerTransform({ w, h, zoom: z, rotation }: Frame): string {
  switch (rotation) {
    case 90:
      return `matrix(0, 1, -1, 0, ${h * z}, 0)`;
    case 180:
      return `matrix(-1, 0, 0, -1, ${w * z}, ${h * z})`;
    case 270:
      return `matrix(0, -1, 1, 0, 0, ${w * z})`;
    default:
      return "none";
  }
}

/** Crop box of a page in PDF user space (unrotated). */
export interface UserBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Page space to PDF user space (y up) for a page with intrinsic rotation `rot` and crop box `box`.
 * Content drawn in page space keeps its orientation when drawn rotated by `rot` degrees (counter-
 * clockwise in user space) at the mapped point.
 */
export function toUser(rot: Rotation, box: UserBox, [x, y]: Point): Point {
  switch (rot) {
    case 90:
      return [box.x + y, box.y + x];
    case 180:
      return [box.x + box.w - x, box.y + y];
    case 270:
      return [box.x + box.w - y, box.y + box.h - x];
    default:
      return [box.x + x, box.y + box.h - y];
  }
}

/** Page-space size of a page with crop box `box` and intrinsic rotation `rot`. */
export const pageSpaceSize = (rot: Rotation, box: UserBox): [number, number] =>
  rot % 180 === 0 ? [box.w, box.h] : [box.h, box.w];

export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4;
const STEPS = [
  0.25, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4,
];

/** Next zoom preset up or down from `z`. */
export function stepZoom(z: number, dir: 1 | -1): number {
  if (dir > 0) return STEPS.find((s) => s > z + 0.001) ?? ZOOM_MAX;
  return [...STEPS].reverse().find((s) => s < z - 0.001) ?? ZOOM_MIN;
}
