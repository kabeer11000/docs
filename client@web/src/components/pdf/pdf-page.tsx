"use client";

import type {
  AnnotationLayer,
  PDFDocumentProxy,
  PDFPageProxy,
  TextLayer,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import { memo, useEffect, useRef } from "react";
import {
  annotationAt,
  arrowHead,
  bounds,
  NOTE_SIZE,
  rectFrom,
  resize,
  TEXT_LINE_HEIGHT,
  translate,
} from "@/lib/pdf/annotations";
import { isCancelled, pdfjs, renderPage } from "@/lib/pdf/client";
import { type Frame, layerTransform, screenToPage } from "@/lib/pdf/geometry";
import {
  type Annotation,
  newId,
  type PageRef,
  type Point,
  type Rect,
  type Rotation,
} from "@/lib/pdf/model";
import { cn } from "@/lib/utils";
import { MARKUP_TOOLS, type Tool, type ToolStyle } from "./tools";

/** A live change: `update` re-derives the annotations from the state the gesture started at. */
export interface Gesture {
  update: (fn: (list: Annotation[]) => Annotation[]) => void;
  end: (commit: boolean) => void;
}

export interface OverlayApi {
  tool: Tool;
  style: ToolStyle;
  canEdit: boolean;
  selectedId: string | null;
  editingId: string | null;
  openNoteId: string | null;
  select: (id: string | null) => void;
  edit: (id: string | null) => void;
  openNote: (id: string | null) => void;
  gesture: () => Gesture;
  /** After a text box or note is placed the select tool comes back. */
  placed: () => void;
}

export interface FormsBinding {
  storage: unknown;
  editable: boolean;
  onInput: (annotationId: string) => void;
}

const upsert = (list: Annotation[], a: Annotation) =>
  list.some((x) => x.id === a.id)
    ? list.map((x) => (x.id === a.id ? a : x))
    : [...list, a];

/** ENABLE_FORMS: form widgets come from the HTML layer, everything else is painted on the canvas. */
const ANNOTATION_MODE_FORMS = 2;

interface PageViewProps {
  pdf: PDFDocumentProxy | null;
  page: PageRef;
  index: number;
  w: number;
  h: number;
  zoom: number;
  rotation: Rotation;
  visible: boolean;
  annotations: Annotation[];
  matches: Rect[];
  currentMatch: Rect | null;
  api: OverlayApi;
  forms: FormsBinding | null;
  links: unknown;
}

export const PageView = memo(function PageView(p: PageViewProps) {
  const slot = useRef<HTMLDivElement>(null);
  const frame: Frame = { w: p.w, h: p.h, zoom: p.zoom, rotation: p.rotation };
  const width = p.rotation % 180 ? p.h * p.zoom : p.w * p.zoom;
  const height = p.rotation % 180 ? p.w * p.zoom : p.h * p.zoom;
  // Pending edit of a just-placed text box or note, picked up by its editor.
  const pending = useRef<{ id: string; g: Gesture } | null>(null);

  const toPage = (e: { clientX: number; clientY: number }): Point => {
    const r = slot.current?.getBoundingClientRect();
    return r
      ? screenToPage(frame, [e.clientX - r.left, e.clientY - r.top])
      : [0, 0];
  };

  const drag = (
    e0: React.PointerEvent,
    onMove: (pt: Point) => void,
    onEnd: (moved: boolean) => void,
    threshold = 3,
  ) => {
    const sx = e0.clientX;
    const sy = e0.clientY;
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < threshold)
        return;
      moved = true;
      onMove(toPage(ev));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      onEnd(moved);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const { api } = p;
  const selected = p.annotations.find((a) => a.id === api.selectedId) ?? null;

  const onPointerDownCapture = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-pdf-ui]")) return;
    const pt = toPage(e);
    const tol = 5 / p.zoom;
    const { tool } = api;

    if (tool === "select" || MARKUP_TOOLS.has(tool) || !api.canEdit) {
      const handle = target.dataset.handle;
      if (handle && selected && api.canEdit) {
        e.preventDefault();
        e.stopPropagation();
        startResize(e, selected, handle);
        return;
      }
      const hit = annotationAt(p.annotations, p.page.id, pt, tol);
      if (!hit) {
        api.select(null);
        api.openNote(null);
        return; // falls through to text selection and form fields
      }
      e.preventDefault();
      e.stopPropagation();
      const wasSelected = api.selectedId === hit.id;
      api.select(hit.id);
      if (!api.canEdit) {
        if (hit.type === "note")
          api.openNote(api.openNoteId === hit.id ? null : hit.id);
        return;
      }
      const g = api.gesture();
      drag(
        e,
        ([x, y]) => {
          const moved = translate(hit, x - pt[0], y - pt[1]);
          g.update((list) => list.map((a) => (a.id === hit.id ? moved : a)));
        },
        (moved) => {
          g.end(moved);
          if (moved) return;
          if (hit.type === "note")
            api.openNote(api.openNoteId === hit.id ? null : hit.id);
          else if (hit.type === "text" && wasSelected) api.edit(hit.id);
        },
      );
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    api.openNote(null);
    api.edit(null);
    const id = newId();
    const pageId = p.page.id;
    const { color, width: strokeWidth, size, fill } = api.style;

    if (tool === "eraser") {
      const g = api.gesture();
      const erased = new Set<string>();
      const erase = (q: Point) => {
        const hit = annotationAt(
          p.annotations.filter((a) => !erased.has(a.id)),
          pageId,
          q,
          tol * 2,
        );
        if (!hit) return;
        erased.add(hit.id);
        g.update((list) => list.filter((a) => !erased.has(a.id)));
      };
      erase(pt);
      drag(e, erase, () => g.end(erased.size > 0), 0);
      return;
    }

    if (tool === "text") {
      const a: Annotation = {
        id,
        pageId,
        type: "text",
        rect: {
          x: pt[0],
          y: pt[1] - size * 0.6,
          w: 220,
          h: size * TEXT_LINE_HEIGHT,
        },
        text: "",
        size,
        color,
      };
      const g = api.gesture();
      g.update((list) => upsert(list, a));
      pending.current = { id, g };
      api.select(id);
      api.edit(id);
      api.placed();
      return;
    }

    if (tool === "note") {
      const a: Annotation = {
        id,
        pageId,
        type: "note",
        at: [pt[0] - NOTE_SIZE / 2, pt[1] - NOTE_SIZE / 2],
        text: "",
        color,
      };
      const g = api.gesture();
      g.update((list) => upsert(list, a));
      pending.current = { id, g };
      api.select(id);
      api.openNote(id);
      api.placed();
      return;
    }

    const g = api.gesture();
    if (tool === "ink") {
      const points: Point[] = [pt];
      const draw = () =>
        g.update((list) =>
          upsert(list, {
            id,
            pageId,
            type: "ink",
            points: [...points],
            color,
            width: strokeWidth,
          }),
        );
      draw();
      drag(
        e,
        (q) => {
          const last = points[points.length - 1];
          if (Math.hypot(q[0] - last[0], q[1] - last[1]) < 0.75 / p.zoom)
            return;
          points.push([Number(q[0].toFixed(2)), Number(q[1].toFixed(2))]);
          draw();
        },
        () => g.end(true),
        0,
      );
      return;
    }

    const shape = (q: Point): Annotation =>
      tool === "line" || tool === "arrow"
        ? { id, pageId, type: tool, from: pt, to: q, color, width: strokeWidth }
        : {
            id,
            pageId,
            type: tool as "rect" | "ellipse",
            rect: rectFrom(pt, q),
            color,
            width: strokeWidth,
            ...(fill ? { fill: color } : {}),
          };
    drag(
      e,
      (q) => g.update((list) => upsert(list, shape(q))),
      (moved) => {
        // A click places a default-sized shape.
        if (!moved)
          g.update((list) =>
            upsert(
              list,
              shape(
                tool === "line" || tool === "arrow"
                  ? [pt[0] + 120, pt[1]]
                  : [pt[0] + 120, pt[1] + 80],
              ),
            ),
          );
        g.end(true);
        api.select(id);
      },
    );
  };

  const startResize = (
    e: React.PointerEvent,
    a: Annotation,
    handle: string,
  ) => {
    const b = bounds(a);
    const fixed: Point = [
      handle.includes("w") ? b.x + b.w : b.x,
      handle.includes("n") ? b.y + b.h : b.y,
    ];
    const keepAspect = a.type === "image" || a.type === "stamp";
    const g = api.gesture();
    drag(
      e,
      ([x, y]) => {
        let w = Math.max(4, Math.abs(x - fixed[0]));
        let h = Math.max(4, Math.abs(y - fixed[1]));
        if (keepAspect && b.w && b.h) {
          h = (w * b.h) / b.w;
          w = Math.max(4, w);
        }
        const rect: Rect = {
          x: x < fixed[0] ? fixed[0] - w : fixed[0],
          y: y < fixed[1] ? fixed[1] - h : fixed[1],
          w,
          h,
        };
        const next = resize(a, rect);
        g.update((list) => list.map((q) => (q.id === a.id ? next : q)));
      },
      (moved) => g.end(moved),
    );
  };

  /** Hover cursor for the select tool: "move" over annotations. */
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons || !slot.current || !api.canEdit || api.tool !== "select")
      return;
    const hit = annotationAt(p.annotations, p.page.id, toPage(e), 5 / p.zoom);
    slot.current.style.cursor = hit ? "move" : "";
  };

  const takeGesture = (id: string): Gesture => {
    const own = pending.current?.id === id ? pending.current.g : api.gesture();
    pending.current = null;
    return own;
  };

  const drawing =
    api.canEdit && api.tool !== "select" && !MARKUP_TOOLS.has(api.tool);
  const z = p.zoom;
  const editing = p.annotations.find(
    (a) => a.id === api.editingId && a.type === "text",
  ) as Extract<Annotation, { type: "text" }> | undefined;
  const openNote = p.annotations.find(
    (a) => a.id === api.openNoteId && a.type === "note",
  ) as Extract<Annotation, { type: "note" }> | undefined;

  return (
    <div
      ref={slot}
      data-page-id={p.page.id}
      data-page-index={p.index}
      onPointerDownCapture={onPointerDownCapture}
      onPointerMove={onPointerMove}
      className="pdf-page relative mx-auto shrink-0 bg-white shadow-[0_1px_3px_rgb(0_0_0/0.12),0_0_0_1px_rgb(0_0_0/0.04)]"
      style={{ width, height, "--scale-factor": z } as React.CSSProperties}
    >
      {p.visible && p.pdf && p.page.src >= 0 && (
        <PageLayers
          pdf={p.pdf}
          src={p.page.src}
          zoom={z}
          rotation={p.rotation}
          forms={p.forms}
          links={p.links}
        />
      )}
      <div
        className="absolute top-0 left-0"
        style={{
          width: p.w * z,
          height: p.h * z,
          transform: layerTransform(frame),
          transformOrigin: "0 0",
          zIndex: 3,
          pointerEvents: drawing ? "auto" : "none",
          touchAction: drawing ? "none" : undefined,
          cursor: drawing
            ? api.tool === "text"
              ? "text"
              : api.tool === "eraser"
                ? "cell"
                : "crosshair"
            : undefined,
        }}
      >
        {p.visible && (
          <>
            <svg
              width={p.w * z}
              height={p.h * z}
              viewBox={`0 0 ${p.w} ${p.h}`}
              className="absolute inset-0 overflow-visible"
              aria-hidden="true"
            >
              {p.matches.map((r, i) => (
                <rect
                  // biome-ignore lint/suspicious/noArrayIndexKey: matches are recomputed as a whole
                  key={i}
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  fill={r === p.currentMatch ? "#ff9f0a" : "#ffe45c"}
                  fillOpacity={r === p.currentMatch ? 0.55 : 0.4}
                  style={{ mixBlendMode: "multiply" }}
                />
              ))}
              {p.annotations.map((a) =>
                a.id === editing?.id ? null : <Shape key={a.id} a={a} />,
              )}
              {selected && api.canEdit && <Selection a={selected} zoom={z} />}
            </svg>
            {p.annotations.map((a) =>
              a.type === "text" && a.id !== editing?.id ? (
                <div
                  key={a.id}
                  className="pointer-events-none absolute whitespace-pre-wrap [overflow-wrap:anywhere]"
                  style={{
                    left: a.rect.x * z,
                    top: a.rect.y * z,
                    width: a.rect.w * z,
                    fontSize: a.size * z,
                    lineHeight: TEXT_LINE_HEIGHT,
                    color: a.color,
                    fontFamily: "Helvetica, Arial, sans-serif",
                  }}
                >
                  {a.text}
                </div>
              ) : null,
            )}
            {selected && api.canEdit && selected.id !== editing?.id && (
              <Handles a={selected} zoom={z} />
            )}
            {editing && api.canEdit && (
              <TextEditor
                key={editing.id}
                a={editing}
                zoom={z}
                takeGesture={takeGesture}
                onDone={() => api.edit(null)}
              />
            )}
            {openNote && (
              <NotePopover
                key={openNote.id}
                a={openNote}
                zoom={z}
                canEdit={api.canEdit}
                takeGesture={takeGesture}
                onClose={() => api.openNote(null)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
});

function Shape({ a }: { a: Annotation }) {
  switch (a.type) {
    case "highlight":
      return (
        <g style={{ mixBlendMode: "multiply" }}>
          {a.rects.map((r, i) => (
            <rect
              // biome-ignore lint/suspicious/noArrayIndexKey: an annotation's rectangles never reorder
              key={i}
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              fill={a.color}
              fillOpacity={0.4}
            />
          ))}
        </g>
      );
    case "underline":
    case "strike":
      return (
        <g stroke={a.color}>
          {a.rects.map((r, i) => {
            const y =
              a.type === "underline" ? r.y + r.h * 0.94 : r.y + r.h * 0.55;
            return (
              <line
                // biome-ignore lint/suspicious/noArrayIndexKey: an annotation's rectangles never reorder
                key={i}
                x1={r.x}
                x2={r.x + r.w}
                y1={y}
                y2={y}
                strokeWidth={Math.max(0.75, r.h * 0.07)}
              />
            );
          })}
        </g>
      );
    case "ink":
      return (
        <polyline
          points={(a.points.length === 1
            ? [a.points[0], [a.points[0][0] + 0.01, a.points[0][1]]]
            : a.points
          )
            .map((q) => q.join(","))
            .join(" ")}
          fill="none"
          stroke={a.color}
          strokeWidth={a.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "rect":
      return (
        <rect
          x={a.rect.x}
          y={a.rect.y}
          width={a.rect.w}
          height={a.rect.h}
          fill={a.fill ?? "none"}
          stroke={a.width ? a.color : "none"}
          strokeWidth={a.width}
        />
      );
    case "ellipse":
      return (
        <ellipse
          cx={a.rect.x + a.rect.w / 2}
          cy={a.rect.y + a.rect.h / 2}
          rx={a.rect.w / 2}
          ry={a.rect.h / 2}
          fill={a.fill ?? "none"}
          stroke={a.width ? a.color : "none"}
          strokeWidth={a.width}
        />
      );
    case "line":
    case "arrow":
      return (
        <g stroke={a.color} fill={a.color}>
          <line
            x1={a.from[0]}
            y1={a.from[1]}
            x2={a.to[0]}
            y2={a.to[1]}
            strokeWidth={a.width}
            strokeLinecap="round"
          />
          {a.type === "arrow" && (
            <polygon
              points={arrowHead(a.from, a.to, a.width)
                .map((q) => q.join(","))
                .join(" ")}
              strokeWidth={0}
            />
          )}
        </g>
      );
    case "note":
      return (
        <g transform={`translate(${a.at[0]} ${a.at[1]})`}>
          <rect
            width={NOTE_SIZE}
            height={NOTE_SIZE}
            rx={4}
            fill={a.color}
            stroke="rgb(0 0 0 / 0.25)"
            strokeWidth={0.75}
          />
          <path
            d="M6 7.5h10M6 11h10M6 14.5h6"
            stroke="rgb(0 0 0 / 0.55)"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        </g>
      );
    case "image":
      return (
        <image
          href={a.src}
          x={a.rect.x}
          y={a.rect.y}
          width={a.rect.w}
          height={a.rect.h}
          preserveAspectRatio="none"
        />
      );
    case "stamp": {
      const { rect: r } = a;
      const size = Math.min(r.h * 0.5, (r.w * 0.86) / (a.label.length * 0.62));
      return (
        <g>
          <rect
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            rx={Math.min(6, r.h * 0.15)}
            fill="none"
            stroke={a.color}
            strokeWidth={Math.max(1.5, r.h * 0.06)}
          />
          <text
            x={r.x + r.w / 2}
            y={r.y + r.h / 2}
            fill={a.color}
            fontSize={size}
            fontWeight={700}
            fontFamily="Helvetica, Arial, sans-serif"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {a.label}
          </text>
        </g>
      );
    }
    default:
      return null;
  }
}

function Selection({ a, zoom }: { a: Annotation; zoom: number }) {
  const b = bounds(a);
  const pad = 3 / zoom;
  return (
    <rect
      x={b.x - pad}
      y={b.y - pad}
      width={b.w + pad * 2}
      height={b.h + pad * 2}
      fill="none"
      stroke="var(--app)"
      strokeWidth={1.25 / zoom}
      strokeDasharray={`${4 / zoom} ${3 / zoom}`}
    />
  );
}

function Handles({ a, zoom }: { a: Annotation; zoom: number }) {
  if (a.type === "note") return null;
  const b = bounds(a);
  const pad = 3 / zoom;
  const corners: [string, number, number][] = [
    ["nw", b.x - pad, b.y - pad],
    ["ne", b.x + b.w + pad, b.y - pad],
    ["sw", b.x - pad, b.y + b.h + pad],
    ["se", b.x + b.w + pad, b.y + b.h + pad],
  ];
  return (
    <>
      {corners.map(([h, x, y]) => (
        <div
          key={h}
          data-handle={h}
          className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[3px] border border-[var(--app)] bg-white"
          style={{
            left: x * zoom,
            top: y * zoom,
            pointerEvents: "auto",
            cursor: h === "nw" || h === "se" ? "nwse-resize" : "nesw-resize",
          }}
        />
      ))}
    </>
  );
}

function TextEditor({
  a,
  zoom,
  takeGesture,
  onDone,
}: {
  a: Extract<Annotation, { type: "text" }>;
  zoom: number;
  takeGesture: (id: string) => Gesture;
  onDone: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const latest = useRef(a);
  latest.current = a;

  // biome-ignore lint/correctness/useExhaustiveDependencies: one edit session per mount (the editor is keyed by id)
  useEffect(() => {
    gesture.current = takeGesture(a.id);
    // After the pointer events that placed the box, so they cannot take the focus back.
    const focus = setTimeout(() => {
      const el = ref.current;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
    }, 0);
    return () => {
      clearTimeout(focus);
      const g = gesture.current;
      gesture.current = null;
      if (!g) return;
      if (!latest.current.text.trim()) {
        g.update((list) => list.filter((x) => x.id !== a.id));
      }
      g.end(true);
    };
  }, []);

  const change = (text: string) => {
    const el = ref.current;
    const h = el
      ? Math.max(a.size * TEXT_LINE_HEIGHT, el.scrollHeight / zoom)
      : a.rect.h;
    const next = {
      ...latest.current,
      text,
      rect: { ...latest.current.rect, h },
    };
    gesture.current?.update((list) => upsert(list, next));
  };

  return (
    <textarea
      ref={ref}
      data-pdf-ui
      value={a.text}
      onChange={(e) => change(e.target.value)}
      onBlur={onDone}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") ref.current?.blur();
      }}
      placeholder="Type here"
      aria-label="Text box"
      rows={1}
      className="absolute resize-none overflow-hidden border border-dashed border-[var(--app)] bg-transparent p-0 outline-none placeholder:text-neutral-400"
      style={{
        left: a.rect.x * zoom,
        top: a.rect.y * zoom,
        width: a.rect.w * zoom,
        height: a.rect.h * zoom,
        fontSize: a.size * zoom,
        lineHeight: TEXT_LINE_HEIGHT,
        color: a.color,
        fontFamily: "Helvetica, Arial, sans-serif",
        pointerEvents: "auto",
      }}
    />
  );
}

function NotePopover({
  a,
  zoom,
  canEdit,
  takeGesture,
  onClose,
}: {
  a: Extract<Annotation, { type: "note" }>;
  zoom: number;
  canEdit: boolean;
  takeGesture: (id: string) => Gesture;
  onClose: () => void;
}) {
  const gesture = useRef<Gesture | null>(null);
  const latest = useRef(a);
  latest.current = a;

  // biome-ignore lint/correctness/useExhaustiveDependencies: one edit session per mount (the popover is keyed by id)
  useEffect(() => {
    if (!canEdit) return;
    gesture.current = takeGesture(a.id);
    return () => {
      const g = gesture.current;
      gesture.current = null;
      if (!g) return;
      if (!latest.current.text.trim())
        g.update((list) => list.filter((x) => x.id !== a.id));
      g.end(true);
    };
  }, []);

  return (
    <div
      data-pdf-ui
      role="dialog"
      aria-label="Note"
      className="absolute w-60 rounded-[14px] border border-border bg-popover p-2 text-popover-foreground shadow-float"
      style={{
        left: (a.at[0] + NOTE_SIZE) * zoom + 6,
        top: a.at[1] * zoom,
        pointerEvents: "auto",
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onClose();
      }}
    >
      {canEdit ? (
        <textarea
          ref={(el) => {
            // Focus once, after the click that opened the note has finished.
            if (el && !el.dataset.focused) {
              el.dataset.focused = "1";
              setTimeout(() => el.focus(), 0);
            }
          }}
          value={a.text}
          onChange={(e) =>
            gesture.current?.update((list) =>
              upsert(list, { ...latest.current, text: e.target.value }),
            )
          }
          placeholder="Add a note"
          aria-label="Note text"
          className="h-24 w-full resize-none rounded-[8px] bg-transparent p-1.5 text-[13px] outline-none"
        />
      ) : (
        <p className="max-h-48 overflow-auto p-1.5 text-[13px] whitespace-pre-wrap">
          {a.text || "Empty note"}
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[8px] px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Done
        </button>
      </div>
    </div>
  );
}

/** Canvas, text layer (selection, find) and form fields of one page. Mounted only near the viewport. */
function PageLayers({
  pdf,
  src,
  zoom,
  rotation,
  forms,
  links,
}: {
  pdf: PDFDocumentProxy;
  src: number;
  zoom: number;
  rotation: Rotation;
  forms: FormsBinding | null;
  links: unknown;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const textDiv = useRef<HTMLDivElement>(null);
  const formDiv = useRef<HTMLDivElement>(null);
  const pageRef = useRef<PDFPageProxy | null>(null);
  const layers = useRef<{
    text: TextLayer | null;
    form: AnnotationLayer | null;
  }>({ text: null, form: null });
  const view = useRef({ zoom, rotation });
  view.current = { zoom, rotation };
  const formsRef = useRef(forms);
  formsRef.current = forms;

  // Page, text layer and form layer: created once per page; zoom and rotation only update them.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `draw` reads the latest zoom through a ref
  useEffect(() => {
    let live = true;
    const textLayers: TextLayer[] = [];
    (async () => {
      const [m, page] = await Promise.all([pdfjs(), pdf.getPage(src + 1)]);
      if (!live || !textDiv.current || !formDiv.current) return;
      pageRef.current = page;
      const viewport = page.getViewport({
        scale: view.current.zoom,
        rotation: (page.rotate + view.current.rotation) % 360,
      });
      draw(page);

      const text = new m.TextLayer({
        textContentSource: page.streamTextContent({
          includeMarkedContent: true,
          disableNormalization: true,
        }),
        container: textDiv.current,
        viewport,
      });
      textLayers.push(text);
      layers.current.text = text;
      text.render().catch(() => {});

      const annotations = await page.getAnnotations({ intent: "display" });
      if (!live || !formDiv.current || !annotations.length) return;
      const f = formsRef.current;
      const form = new m.AnnotationLayer({
        div: formDiv.current,
        page,
        viewport: viewport.clone({ dontFlip: true }),
        annotationStorage: f?.storage ?? pdf.annotationStorage,
        linkService: links,
        accessibilityManager: null,
        annotationCanvasMap: null,
        annotationEditorUIManager: null,
        structTreeLayer: null,
        commentManager: null,
      });
      layers.current.form = form;
      await form.render({
        viewport: viewport.clone({ dontFlip: true }),
        div: formDiv.current,
        annotations,
        page,
        linkService: links as never,
        annotationStorage: (f?.storage ?? pdf.annotationStorage) as never,
        renderForms: true,
        imageResourcesPath: "",
      });
    })().catch((e) => console.error("[pdf] page layers", e));
    return () => {
      live = false;
      for (const t of textLayers) t.cancel();
      layers.current = { text: null, form: null };
      textDiv.current?.replaceChildren();
      formDiv.current?.replaceChildren();
      pageRef.current = null;
    };
  }, [pdf, src, links]);

  const task = useRef<{ cancel: () => void } | null>(null);
  const draw = (page: PDFPageProxy) => {
    task.current?.cancel();
    const canvas = document.createElement("canvas");
    const { task: t, viewport } = renderPage(
      page,
      canvas,
      view.current.zoom,
      view.current.rotation,
      ANNOTATION_MODE_FORMS,
    );
    task.current = t;
    t.promise
      .then(() => {
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.className = "absolute inset-0";
        holder.current?.replaceChildren(canvas);
        layers.current.text?.update({ viewport });
        layers.current.form?.update({
          viewport: viewport.clone({ dontFlip: true }),
        } as never);
      })
      .catch((e) => {
        if (!isCancelled(e)) console.error("[pdf] render", e);
      });
  };

  // Re-render the canvas after zooming settles; until then the old canvas is scaled by CSS.
  // biome-ignore lint/correctness/useExhaustiveDependencies: zoom and rotation are what trigger the redraw
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const t = setTimeout(() => draw(page), 140);
    return () => clearTimeout(t);
  }, [zoom, rotation]);

  useEffect(() => () => task.current?.cancel(), []);

  // Form input: report which field changed (the storage already holds the value).
  useEffect(() => {
    const div = formDiv.current;
    if (!div) return;
    const onInput = (e: Event) => {
      const id = (e.target as HTMLElement)
        .closest("[data-annotation-id]")
        ?.getAttribute("data-annotation-id");
      if (id) formsRef.current?.onInput(id);
    };
    div.addEventListener("input", onInput);
    div.addEventListener("change", onInput);
    return () => {
      div.removeEventListener("input", onInput);
      div.removeEventListener("change", onInput);
    };
  }, []);

  return (
    <>
      <div ref={holder} className="absolute inset-0 overflow-hidden" />
      <div ref={textDiv} className="textLayer" />
      <div
        ref={formDiv}
        className={cn("annotationLayer", !forms?.editable && "disabled")}
      />
    </>
  );
}
