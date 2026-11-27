// Geometry of annotations in page space: bounds, move, resize, hit testing. Pure.
import type { Annotation, Point, Rect } from "./model";

/** Size of a sticky note's icon, in points. */
export const NOTE_SIZE = 22;

const union = (rects: Rect[]): Rect => {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const r = Math.max(...rects.map((q) => q.x + q.w));
  const b = Math.max(...rects.map((q) => q.y + q.h));
  return { x, y, w: r - x, h: b - y };
};
const pointsRect = (pts: Point[]): Rect =>
  union(pts.map(([x, y]) => ({ x, y, w: 0, h: 0 })));

export function bounds(a: Annotation): Rect {
  switch (a.type) {
    case "highlight":
    case "underline":
    case "strike":
      return union(a.rects);
    case "ink":
      return pointsRect(a.points);
    case "line":
    case "arrow":
      return pointsRect([a.from, a.to]);
    case "note":
      return { x: a.at[0], y: a.at[1], w: NOTE_SIZE, h: NOTE_SIZE };
    default:
      return a.rect;
  }
}

/** Applies `f` to every coordinate of `a` (rect corners included). */
function mapGeometry(a: Annotation, f: (p: Point) => Point): Annotation {
  const mapRect = (r: Rect): Rect => {
    const [x1, y1] = f([r.x, r.y]);
    const [x2, y2] = f([r.x + r.w, r.y + r.h]);
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      w: Math.abs(x2 - x1),
      h: Math.abs(y2 - y1),
    };
  };
  switch (a.type) {
    case "highlight":
    case "underline":
    case "strike":
      return { ...a, rects: a.rects.map(mapRect) };
    case "ink":
      return { ...a, points: a.points.map(f) };
    case "line":
    case "arrow":
      return { ...a, from: f(a.from), to: f(a.to) };
    case "note":
      return { ...a, at: f(a.at) };
    default:
      return { ...a, rect: mapRect(a.rect) };
  }
}

export const translate = (a: Annotation, dx: number, dy: number): Annotation =>
  mapGeometry(a, ([x, y]) => [x + dx, y + dy]);

/** Scales `a` so its bounds become `to`. Notes only move (their icon has a fixed size). */
export function resize(a: Annotation, to: Rect): Annotation {
  const from = bounds(a);
  if (a.type === "note") return translate(a, to.x - from.x, to.y - from.y);
  const sx = from.w ? to.w / from.w : 1;
  const sy = from.h ? to.h / from.h : 1;
  return mapGeometry(a, ([x, y]) => [
    to.x + (x - from.x) * sx,
    to.y + (y - from.y) * sy,
  ]);
}

const distToSegment = ([px, py]: Point, [ax, ay]: Point, [bx, by]: Point) => {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len
    ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len))
    : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
const inRect = ([x, y]: Point, r: Rect, pad: number) =>
  x >= r.x - pad &&
  x <= r.x + r.w + pad &&
  y >= r.y - pad &&
  y <= r.y + r.h + pad;

/** True when page point `p` touches `a` (within `tol` points). Strokes are hit on the line, not the box. */
export function hitTest(a: Annotation, p: Point, tol = 4): boolean {
  switch (a.type) {
    case "ink": {
      const pad = tol + a.width / 2;
      if (a.points.length === 1)
        return Math.hypot(p[0] - a.points[0][0], p[1] - a.points[0][1]) <= pad;
      for (let i = 1; i < a.points.length; i++)
        if (distToSegment(p, a.points[i - 1], a.points[i]) <= pad) return true;
      return false;
    }
    case "line":
    case "arrow":
      return distToSegment(p, a.from, a.to) <= tol + a.width / 2;
    case "highlight":
    case "underline":
    case "strike":
      return a.rects.some((r) => inRect(p, r, tol / 2));
    case "rect":
    case "ellipse":
      if (a.fill) return inRect(p, a.rect, tol);
      // Outline only: near any edge.
      return (
        inRect(p, a.rect, tol + a.width) &&
        !inRect(
          p,
          {
            x: a.rect.x + tol + a.width,
            y: a.rect.y + tol + a.width,
            w: a.rect.w - 2 * (tol + a.width),
            h: a.rect.h - 2 * (tol + a.width),
          },
          0,
        )
      );
    default:
      return inRect(p, bounds(a), tol);
  }
}

/** Topmost annotation under `p` on the page (later annotations paint on top). */
export function annotationAt(
  list: Annotation[],
  pageId: string,
  p: Point,
  tol?: number,
): Annotation | null {
  for (let i = list.length - 1; i >= 0; i--)
    if (list[i].pageId === pageId && hitTest(list[i], p, tol)) return list[i];
  return null;
}

/**
 * Selection rectangles (one per text run) merged into one rectangle per line: runs that overlap
 * vertically by more than half their height and sit next to each other horizontally.
 */
export function mergeLineRects(rects: Rect[]): Rect[] {
  const sorted = rects
    .filter((r) => r.w > 0.5 && r.h > 0.5)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const out: Rect[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    const overlap = last
      ? Math.min(last.y + last.h, r.y + r.h) - Math.max(last.y, r.y)
      : 0;
    if (
      last &&
      overlap > Math.min(last.h, r.h) * 0.5 &&
      r.x <= last.x + last.w + r.h
    ) {
      out[out.length - 1] = union([last, r]);
    } else out.push(r);
  }
  return out;
}

/** Rectangle spanned by two points. */
export const rectFrom = ([ax, ay]: Point, [bx, by]: Point): Rect => ({
  x: Math.min(ax, bx),
  y: Math.min(ay, by),
  w: Math.abs(bx - ax),
  h: Math.abs(by - ay),
});

/** The two barbs of an arrow head at `to`, as a closed triangle. */
export function arrowHead(from: Point, to: Point, width: number): Point[] {
  const len = Math.max(8, width * 4);
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const spread = Math.PI / 7;
  return [
    to,
    [
      to[0] - len * Math.cos(angle - spread),
      to[1] - len * Math.sin(angle - spread),
    ],
    [
      to[0] - len * Math.cos(angle + spread),
      to[1] - len * Math.sin(angle + spread),
    ],
  ];
}

/** Baseline of a text box's first line below its top, as a share of the font size (matches the editor's CSS). */
export const TEXT_BASELINE = 0.95;
export const TEXT_LINE_HEIGHT = 1.2;
