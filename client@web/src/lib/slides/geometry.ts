import { SLIDE_H, SLIDE_W } from "./styles";

/** A box in percent of the canvas. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Guides {
  /** Vertical guide lines at these x percents. */
  v: number[];
  /** Horizontal guide lines at these y percents. */
  h: number[];
}

/** Snap distance in canvas pixels. */
export const SNAP_PX = 8;

function snapAxis(
  start: number,
  size: number,
  targets: number[],
  threshold: number,
) {
  let best: { delta: number; at: number } | null = null;
  for (const anchor of [start, start + size / 2, start + size]) {
    for (const t of targets) {
      const delta = t - anchor;
      if (
        Math.abs(delta) <= threshold &&
        (!best || Math.abs(delta) < Math.abs(best.delta))
      )
        best = { delta, at: t };
    }
  }
  return best;
}

const targetsOf = (others: Box[], axis: "x" | "y") => [
  0,
  50,
  100,
  ...others.flatMap((o) =>
    axis === "x"
      ? [o.x, o.x + o.w / 2, o.x + o.w]
      : [o.y, o.y + o.h / 2, o.y + o.h],
  ),
];

/**
 * Snaps a moving box's edges or centre to the slide's edges and centre and to the other elements.
 * Returns the adjusted position and the guide lines to draw.
 */
export function snapMove(
  box: Box,
  others: Box[],
  px = SNAP_PX,
): { x: number; y: number; guides: Guides } {
  const sx = snapAxis(
    box.x,
    box.w,
    targetsOf(others, "x"),
    (px / SLIDE_W) * 100,
  );
  const sy = snapAxis(
    box.y,
    box.h,
    targetsOf(others, "y"),
    (px / SLIDE_H) * 100,
  );
  return {
    x: box.x + (sx?.delta ?? 0),
    y: box.y + (sy?.delta ?? 0),
    guides: { v: sx ? [sx.at] : [], h: sy ? [sy.at] : [] },
  };
}

export type Handle = "nw" | "ne" | "sw" | "se";

/** The box after dragging a corner by (dx, dy) percent; never smaller than `min` percent on a side. */
export function resizeBox(
  box: Box,
  handle: Handle,
  dx: number,
  dy: number,
  min = 2,
): Box {
  let { x, y, w, h } = box;
  if (handle.includes("w")) {
    const nw = Math.max(min, w - dx);
    x += w - nw;
    w = nw;
  } else w = Math.max(min, w + dx);
  if (handle.includes("n")) {
    const nh = Math.max(min, h - dy);
    y += h - nh;
    h = nh;
  } else h = Math.max(min, h + dy);
  return { x, y, w, h };
}

/** Keeps at least a sliver of the box on the slide so it can always be grabbed again. */
export function keepOnSlide(box: Box, sliver = 4): Box {
  return {
    ...box,
    x: Math.min(100 - sliver, Math.max(sliver - box.w, box.x)),
    y: Math.min(100 - sliver, Math.max(sliver - box.h, box.y)),
  };
}

const round = (n: number) => Math.round(n * 100) / 100;
export const roundBox = (b: Box): Box => ({
  x: round(b.x),
  y: round(b.y),
  w: round(b.w),
  h: round(b.h),
});

/** A box for an image of the given pixel size: `width` percent wide, centred, never taller than 80%. */
export function imageBox(naturalW: number, naturalH: number, width = 40): Box {
  const ratio = naturalW > 0 && naturalH > 0 ? naturalH / naturalW : 0.75;
  let w = width;
  let h = (w * ratio * SLIDE_W) / SLIDE_H;
  if (h > 80) {
    w = (w * 80) / h;
    h = 80;
  }
  return roundBox({ x: (100 - w) / 2, y: (100 - h) / 2, w, h });
}

export type AlignMode =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";

/** The box around several boxes. */
export function boundsOf(boxes: Box[]): Box {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return {
    x,
    y,
    w: Math.max(...boxes.map((b) => b.x + b.w)) - x,
    h: Math.max(...boxes.map((b) => b.y + b.h)) - y,
  };
}

/** Aligns boxes to their shared bounds (a single box aligns to the slide). Returns new positions in input order. */
export function alignBoxes(boxes: Box[], mode: AlignMode): Box[] {
  const r =
    boxes.length === 1 ? { x: 0, y: 0, w: 100, h: 100 } : boundsOf(boxes);
  return boxes.map((b) => {
    switch (mode) {
      case "left":
        return { ...b, x: r.x };
      case "center":
        return { ...b, x: r.x + (r.w - b.w) / 2 };
      case "right":
        return { ...b, x: r.x + r.w - b.w };
      case "top":
        return { ...b, y: r.y };
      case "middle":
        return { ...b, y: r.y + (r.h - b.h) / 2 };
      default:
        return { ...b, y: r.y + r.h - b.h };
    }
  });
}

/** Spaces three or more boxes evenly between the outermost two. Returns new positions in input order. */
export function distributeBoxes(boxes: Box[], axis: "x" | "y"): Box[] {
  if (boxes.length < 3) return boxes;
  const size = axis === "x" ? "w" : "h";
  const order = boxes
    .map((b, i) => ({ b, i }))
    .sort((p, q) => p.b[axis] - q.b[axis]);
  const first = order[0].b;
  const last = order[order.length - 1].b;
  const total = order.reduce((s, { b }) => s + b[size], 0);
  const gap =
    (last[axis] + last[size] - first[axis] - total) / (boxes.length - 1);
  const out = [...boxes];
  let pos = first[axis];
  for (const { b, i } of order) {
    out[i] = { ...b, [axis]: pos };
    pos += b[size] + gap;
  }
  return out;
}
