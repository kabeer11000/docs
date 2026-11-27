"use client";

import type { Editor } from "@tiptap/react";
import { Lock, RotateCw } from "lucide-react";
import {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type * as Y from "yjs";
import {
  duplicateElement,
  elementField,
  patchElement,
  removeElement,
} from "@/lib/slides/deck-doc";
import {
  elementClass,
  elementCss,
  elementInner,
  styleObject,
} from "@/lib/slides/elements";
import {
  boundsOf,
  type Guides,
  type Handle,
  keepOnSlide,
  resizeBox,
  roundBox,
  snapMove,
} from "@/lib/slides/geometry";
import type { Slide, SlideElement } from "@/lib/slides/model";
import { SLIDE_H, SLIDE_W } from "@/lib/slides/styles";
import { cn } from "@/lib/utils";
import { isTextBoxEmpty, pasteElements } from "./element-actions";
import { RegionEditor } from "./region-editor";
import { Markup } from "./slide-view";

type Preview = Record<string, Partial<SlideElement>>;

// ponytail: in-deck clipboard (module scope); the system clipboard is left to text editing.
let clipboard: SlideElement[] = [];
let copiedAt = 0;
// Copying anything else (text, outside the app) hands Ctrl+V back to the system clipboard.
const forgetOnForeignCopy = () => {
  if (Date.now() - copiedAt > 250) clipboard = [];
};

const HANDLES: { h: Handle; style: React.CSSProperties; cursor: string }[] = [
  { h: "nw", style: { left: 0, top: 0 }, cursor: "nwse-resize" },
  { h: "ne", style: { left: "100%", top: 0 }, cursor: "nesw-resize" },
  { h: "sw", style: { left: 0, top: "100%" }, cursor: "nesw-resize" },
  { h: "se", style: { left: "100%", top: "100%" }, cursor: "nwse-resize" },
];

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  !!t.closest(
    'input,textarea,select,[contenteditable="true"],[role="dialog"],[role="menu"]',
  );

export interface ElementEditorOptions {
  doc: Y.Doc;
  slide: Slide;
  canEdit: boolean;
  scale: number;
  selected: string[];
  onSelect: (ids: string[]) => void;
  editingId: string | null;
  onEditing: (id: string | null) => void;
  onTextFocus: (editor: Editor) => void;
  /** Contextual toolbar for the selection. */
  toolbar: (elements: SlideElement[]) => ReactNode;
}

/**
 * Free elements on the canvas: the elements themselves (drawn inside the scaled slide) and the selection
 * overlay (frames, handles, contextual toolbar; drawn outside it so nothing is clipped at the slide edge).
 * Moves and resizes preview locally and commit to the doc once, on release.
 */
export function useElementEditor(o: ElementEditorOptions) {
  const {
    doc,
    slide,
    canEdit,
    scale,
    selected,
    onSelect,
    editingId,
    onEditing,
  } = o;
  const [preview, setPreview] = useState<Preview>({});
  const [guides, setGuides] = useState<Guides | null>(null);
  const [dragging, setDragging] = useState(false);

  const merged = slide.elements.map((e) =>
    preview[e.id] ? { ...e, ...preview[e.id] } : e,
  );
  const selectedEls = merged.filter((e) => selected.includes(e.id));

  const startDrag = useCallback(
    (
      e: ReactPointerEvent,
      mode: "move" | "resize" | "rotate",
      ids: string[],
      handle: Handle = "se",
    ) => {
      e.preventDefault();
      e.stopPropagation();
      const origin = Object.fromEntries(
        slide.elements
          .filter((el) => ids.includes(el.id))
          .map((el) => [el.id, el]),
      );
      const list = Object.values(origin);
      if (!list.length) return;
      const others = slide.elements.filter((el) => !ids.includes(el.id));
      const sx = e.clientX;
      const sy = e.clientY;
      const frame = (e.currentTarget as HTMLElement)
        .closest("[data-el-frame]")
        ?.getBoundingClientRect();
      const center = frame
        ? { x: frame.left + frame.width / 2, y: frame.top + frame.height / 2 }
        : { x: sx, y: sy };
      const px = SLIDE_W * scale;
      const py = SLIDE_H * scale;
      let latest: Preview = {};
      setDragging(true);

      const move = (ev: PointerEvent) => {
        const dxPx = ev.clientX - sx;
        const dyPx = ev.clientY - sy;
        if (mode === "move") {
          const b = boundsOf(list);
          const moved = {
            ...b,
            x: b.x + (dxPx / px) * 100,
            y: b.y + (dyPx / py) * 100,
          };
          const snapped = ev.altKey
            ? { x: moved.x, y: moved.y, guides: { v: [], h: [] } }
            : snapMove(moved, others);
          latest = Object.fromEntries(
            list.map((el) => [
              el.id,
              { x: el.x + snapped.x - b.x, y: el.y + snapped.y - b.y },
            ]),
          );
          setGuides(snapped.guides);
        } else if (mode === "resize") {
          const el = list[0];
          // Drag in the element's own (rotated) frame.
          const t = (-(el.rotation ?? 0) * Math.PI) / 180;
          const lx = dxPx * Math.cos(t) - dyPx * Math.sin(t);
          const ly = dxPx * Math.sin(t) + dyPx * Math.cos(t);
          const box = resizeBox(
            el,
            handle,
            (lx / px) * 100,
            (ly / py) * 100,
            0.5,
          );
          const keepRatio =
            (el.type === "image" || el.type === "icon") !== ev.shiftKey;
          if (keepRatio) {
            const h = box.w * (el.h / el.w);
            if (handle.includes("n")) box.y = el.y + el.h - h;
            box.h = h;
          }
          latest = { [el.id]: box };
        } else {
          let r =
            (Math.atan2(ev.clientY - center.y, ev.clientX - center.x) * 180) /
              Math.PI +
            90;
          r = ev.shiftKey ? Math.round(r / 15) * 15 : r;
          const near = Math.round(r / 45) * 45;
          if (Math.abs(r - near) < 3) r = near;
          latest = {
            [list[0].id]: {
              rotation: Math.round((((r % 360) + 360) % 360) * 10) / 10,
            },
          };
        }
        setPreview(latest);
      };

      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        setGuides(null);
        setDragging(false);
        if (Object.keys(latest).length) {
          doc.transact(() => {
            for (const [id, p] of Object.entries(latest)) {
              if ("rotation" in p)
                patchElement(doc, id, { rotation: p.rotation || undefined });
              else
                patchElement(
                  doc,
                  id,
                  roundBox(
                    keepOnSlide({ ...origin[id], ...p } as SlideElement),
                  ),
                );
            }
          });
        }
        setPreview({});
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [slide.elements, scale, doc],
  );

  const onElementDown = (e: ReactPointerEvent, el: SlideElement) => {
    if (!canEdit || e.button !== 0 || editingId === el.id) return;
    e.stopPropagation();
    if (e.shiftKey) {
      onSelect(
        selected.includes(el.id)
          ? selected.filter((i) => i !== el.id)
          : [...selected, el.id],
      );
      return;
    }
    const ids = selected.includes(el.id) ? selected : [el.id];
    onSelect(ids);
    if (editingId) onEditing(null);
    const movable = ids.filter(
      (id) => !slide.elements.find((x) => x.id === id)?.locked,
    );
    if (movable.length) startDrag(e, "move", movable);
  };

  // An emptied text box disappears once you leave it.
  const prevEditing = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevEditing.current;
    prevEditing.current = editingId;
    if (prev && prev !== editingId && canEdit && isTextBoxEmpty(doc, prev))
      removeElement(doc, prev);
  }, [editingId, doc, canEdit]);

  // Keyboard: nudge, delete, duplicate, copy/paste, deselect.
  const live = useRef({ slide, selected });
  live.current = { slide, selected };
  useEffect(() => {
    if (!canEdit) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const { slide: s, selected: sel } = live.current;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === "v" && clipboard.length) {
        e.preventDefault();
        onSelect(pasteElements(doc, s.id, clipboard));
        clipboard = clipboard.map((c) => ({ ...c, x: c.x + 2, y: c.y + 3 }));
        return;
      }
      if (!sel.length) return;
      const els = s.elements.filter((x) => sel.includes(x.id));
      const movable = els.filter((x) => !x.locked);
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        e.stopPropagation();
        const step = e.shiftKey ? 10 : 1;
        const dx =
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy =
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        doc.transact(() => {
          for (const x of movable)
            patchElement(
              doc,
              x.id,
              roundBox(
                keepOnSlide({
                  ...x,
                  x: x.x + (dx / SLIDE_W) * 100,
                  y: x.y + (dy / SLIDE_H) * 100,
                }),
              ),
            );
        });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        e.stopPropagation();
        doc.transact(() => {
          for (const x of movable) removeElement(doc, x.id);
        });
        onSelect([]);
      } else if (e.key === "Escape") {
        onSelect([]);
      } else if (mod && key === "d") {
        e.preventDefault();
        e.stopPropagation();
        const ids: string[] = [];
        doc.transact(() => {
          for (const x of els) {
            const id = duplicateElement(doc, x.id);
            if (id) ids.push(id);
          }
        });
        onSelect(ids);
      } else if (mod && key === "c") {
        clipboard = els.map((x) => ({ ...x }));
        copiedAt = Date.now();
      } else if (mod && key === "x") {
        clipboard = els.map((x) => ({ ...x }));
        copiedAt = Date.now();
        doc.transact(() => {
          for (const x of movable) removeElement(doc, x.id);
        });
        onSelect([]);
      }
    };
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("copy", forgetOnForeignCopy);
    document.addEventListener("cut", forgetOnForeignCopy);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("copy", forgetOnForeignCopy);
      document.removeEventListener("cut", forgetOnForeignCopy);
    };
  }, [canEdit, doc, onSelect]);

  const hairline = 1.5 / Math.max(scale, 0.01);

  const layer = (
    <>
      {merged.map((el) => {
        const editing = editingId === el.id;
        const common = {
          "data-el-id": el.id,
          className: cn(
            elementClass(el),
            canEdit &&
              !editing &&
              (el.locked ? "cursor-default" : "cursor-move"),
            canEdit &&
              "hover:[outline-style:solid] [outline-color:color-mix(in_srgb,var(--app)_55%,transparent)]",
            el.type === "text" &&
              canEdit &&
              !el.html &&
              !editing &&
              "[outline-style:dashed]",
          ),
          style: { ...styleObject(elementCss(el)), outlineWidth: hairline },
          onPointerDown: (e: ReactPointerEvent) => onElementDown(e, el),
        };
        if (el.type !== "text")
          return <Markup key={el.id} {...common} html={elementInner(el)} />;
        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: canvas object; keyboard editing is handled globally
          <div
            key={el.id}
            {...common}
            onDoubleClick={() => {
              if (!canEdit || el.locked) return;
              onSelect([el.id]);
              onEditing(el.id);
            }}
          >
            <RegionEditor
              doc={doc}
              name={elementField(el.id)}
              editable={canEdit && editing}
              autoFocus
              placeholder="Type something"
              onFocus={o.onTextFocus}
            />
          </div>
        );
      })}
      {guides?.v.map((x) => (
        <div
          key={`v${x}`}
          aria-hidden
          className="pointer-events-none absolute top-0 bottom-0 z-50 bg-app"
          style={{ left: `${x}%`, width: hairline }}
        />
      ))}
      {guides?.h.map((y) => (
        <div
          key={`h${y}`}
          aria-hidden
          className="pointer-events-none absolute right-0 left-0 z-50 bg-app"
          style={{ top: `${y}%`, height: hairline }}
        />
      ))}
    </>
  );

  const single = selectedEls.length === 1 ? selectedEls[0] : null;
  const bounds = selectedEls.length ? boundsOf(selectedEls) : null;
  const showHandles =
    !!single && canEdit && !single.locked && editingId !== single.id;

  const overlay = (
    <div className="pointer-events-none absolute inset-0">
      {selectedEls.map((el) => (
        <div
          key={el.id}
          data-el-frame
          className="absolute"
          style={{
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.w}%`,
            height: `${el.h}%`,
            transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
          }}
        >
          <div className="absolute -inset-px rounded-[2px] border-2 border-app" />
          {el.locked && (
            <span className="absolute -top-2.5 -right-2.5 flex size-5 items-center justify-center rounded-full bg-app text-app-foreground shadow-float">
              <Lock className="size-3" />
            </span>
          )}
          {showHandles && single?.id === el.id && (
            <>
              {HANDLES.map(({ h, style, cursor }) => (
                <button
                  key={h}
                  type="button"
                  aria-label="Resize"
                  tabIndex={-1}
                  className="pointer-events-auto absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-app bg-card shadow-float"
                  style={{ ...style, cursor }}
                  onPointerDown={(e) => startDrag(e, "resize", [el.id], h)}
                />
              ))}
              <span className="absolute -top-6 left-1/2 h-6 w-0.5 -translate-x-1/2 bg-app/70" />
              <button
                type="button"
                aria-label="Rotate"
                tabIndex={-1}
                className="pointer-events-auto absolute -top-9 left-1/2 flex size-6 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-float active:cursor-grabbing"
                onPointerDown={(e) => startDrag(e, "rotate", [el.id])}
              >
                <RotateCw className="size-3.5" />
              </button>
            </>
          )}
        </div>
      ))}
      {bounds && canEdit && !dragging && (
        <div
          className="pointer-events-auto absolute z-20 -translate-x-1/2"
          style={{
            left: `${Math.min(88, Math.max(12, bounds.x + bounds.w / 2))}%`,
            top:
              bounds.y > 16
                ? `calc(${bounds.y}% - ${showHandles ? 96 : 60}px)`
                : `calc(${bounds.y + bounds.h}% + 16px)`,
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {o.toolbar(selectedEls)}
        </div>
      )}
    </div>
  );

  return { layer, overlay, dragging };
}
