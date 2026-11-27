"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { memo, useEffect, useRef, useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { isCancelled, renderPage } from "@/lib/pdf/client";
import type { PageRef, Rotation } from "@/lib/pdf/model";
import { cn } from "@/lib/utils";

const THUMB_W = 116;

export interface ThumbActions {
  click: (id: string, e: React.MouseEvent) => void;
  move: (id: string, to: number) => void;
  rotate: (ids: string[], delta: 90 | -90) => void;
  duplicate: (ids: string[]) => void;
  remove: (ids: string[]) => void;
  insertBlankAfter: (id: string) => void;
  extract: (ids: string[]) => void;
}

export function Thumbnails({
  pdf,
  pages,
  sizes,
  currentId,
  selected,
  canEdit,
  actions,
}: {
  pdf: PDFDocumentProxy | null;
  pages: PageRef[];
  sizes: (p: PageRef) => [number, number];
  currentId: string | null;
  selected: string[];
  canEdit: boolean;
  actions: ThumbActions;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const ids = pages.map((p) => p.id);
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the current page's thumbnail in view while scrolling the document.
  useEffect(() => {
    if (!currentId) return;
    scroller.current
      ?.querySelector(`[data-thumb="${currentId}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [currentId]);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id)
      actions.move(String(active.id), ids.indexOf(String(over.id)));
  };

  return (
    <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={ids}
          strategy={verticalListSortingStrategy}
          disabled={!canEdit}
        >
          <ol className="flex flex-col items-center gap-3">
            {pages.map((p, i) => (
              <Thumb
                key={p.id}
                pdf={pdf}
                page={p}
                size={sizes(p)}
                number={i + 1}
                current={p.id === currentId}
                selected={selected.includes(p.id)}
                targets={selected.includes(p.id) ? selected : [p.id]}
                canEdit={canEdit}
                canDelete={pages.length > 1}
                actions={actions}
                root={scroller}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}

const Thumb = memo(function Thumb({
  pdf,
  page,
  size: [w, h],
  number,
  current,
  selected,
  targets,
  canEdit,
  canDelete,
  actions,
  root,
}: {
  pdf: PDFDocumentProxy | null;
  page: PageRef;
  size: [number, number];
  number: number;
  current: boolean;
  selected: boolean;
  targets: string[];
  canEdit: boolean;
  canDelete: boolean;
  actions: ThumbActions;
  root: React.RefObject<HTMLDivElement | null>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });
  const scale = THUMB_W / Math.max(w, h * 0.77);
  const turned = page.rotation % 180 !== 0;
  const boxW = (turned ? h : w) * scale;
  const boxH = (turned ? w : h) * scale;
  const many = targets.length > 1 ? ` (${targets.length} pages)` : "";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex flex-col items-center gap-1",
        isDragging && "z-10 opacity-80",
      )}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            type="button"
            {...attributes}
            {...listeners}
            data-thumb={page.id}
            aria-label={`Page ${number}`}
            aria-current={current ? "page" : undefined}
            aria-pressed={selected}
            onClick={(e) => actions.click(page.id, e)}
            className={cn(
              "relative overflow-hidden rounded-[3px] bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.08)] outline-none transition-shadow focus-visible:ring-[3px] focus-visible:ring-ring/40",
              selected && "shadow-[0_0_0_2px_var(--app)]",
              current &&
                !selected &&
                "shadow-[0_0_0_2px_color-mix(in_srgb,var(--app)_45%,transparent)]",
            )}
            style={{ width: boxW, height: boxH }}
          >
            {page.src >= 0 && pdf && (
              <ThumbCanvas
                pdf={pdf}
                src={page.src}
                scale={scale}
                rotation={page.rotation}
                root={root}
              />
            )}
          </button>
        </ContextMenuTrigger>
        {canEdit && (
          <ContextMenuContent className="w-56">
            <ContextMenuItem onSelect={() => actions.rotate(targets, 90)}>
              Rotate clockwise{many}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => actions.rotate(targets, -90)}>
              Rotate counterclockwise
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => actions.duplicate(targets)}>
              Duplicate
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => actions.insertBlankAfter(page.id)}>
              Insert blank page after
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => actions.extract(targets)}>
              Extract to PDF
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              disabled={!canDelete}
              className="text-destructive focus:bg-destructive/10 data-[highlighted]:bg-destructive/10"
              onSelect={() => actions.remove(targets)}
            >
              Delete{many}
            </ContextMenuItem>
          </ContextMenuContent>
        )}
      </ContextMenu>
      <span
        className={cn(
          "text-[11px] tabular-nums text-muted-foreground",
          current && "font-medium text-foreground",
        )}
      >
        {number}
      </span>
    </li>
  );
});

/** A page drawn small once it scrolls into view. */
function ThumbCanvas({
  pdf,
  src,
  scale,
  rotation,
  root,
}: {
  pdf: PDFDocumentProxy;
  src: number;
  scale: number;
  rotation: Rotation;
  root: React.RefObject<HTMLDivElement | null>;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setNear(true),
      { root: root.current, rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  useEffect(() => {
    if (!near) return;
    let task: { cancel: () => void } | null = null;
    let live = true;
    pdf
      .getPage(src + 1)
      .then((page) => {
        if (!live) return;
        const canvas = document.createElement("canvas");
        const r = renderPage(page, canvas, scale, rotation);
        task = r.task;
        return r.task.promise.then(() => {
          canvas.className = "absolute inset-0 size-full";
          holder.current?.replaceChildren(canvas);
        });
      })
      .catch((e) => {
        if (!isCancelled(e)) console.warn("[pdf] thumbnail", e);
      });
    return () => {
      live = false;
      task?.cancel();
    };
  }, [near, pdf, src, scale, rotation]);

  return <div ref={holder} className="absolute inset-0" />;
}

export interface OutlineItem {
  title: string;
  dest: unknown;
  items: OutlineItem[];
}

export function Outline({
  items,
  onGo,
}: {
  items: OutlineItem[];
  onGo: (dest: unknown) => void;
}) {
  return (
    <nav
      aria-label="Bookmarks"
      className="min-h-0 flex-1 overflow-y-auto px-2 py-2 text-[13px]"
    >
      <OutlineList items={items} onGo={onGo} depth={0} />
    </nav>
  );
}

function OutlineList({
  items,
  onGo,
  depth,
}: {
  items: OutlineItem[];
  onGo: (dest: unknown) => void;
  depth: number;
}) {
  return (
    <ul>
      {items.map((item, i) => (
        <OutlineRow
          // biome-ignore lint/suspicious/noArrayIndexKey: a PDF's outline is fixed
          key={i}
          item={item}
          onGo={onGo}
          depth={depth}
        />
      ))}
    </ul>
  );
}

function OutlineRow({
  item,
  onGo,
  depth,
}: {
  item: OutlineItem;
  onGo: (dest: unknown) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(depth === 0);
  return (
    <li>
      <div className="flex items-center" style={{ paddingLeft: depth * 12 }}>
        {item.items.length ? (
          <button
            type="button"
            aria-label={open ? "Collapse" : "Expand"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex size-6 shrink-0 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-accent"
          >
            <ChevronRight
              className={cn(
                "size-3.5 transition-transform",
                open && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="w-6 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onGo(item.dest)}
          className="min-w-0 flex-1 truncate rounded-[6px] px-1.5 py-1 text-left hover:bg-accent"
        >
          {item.title || "Untitled"}
        </button>
      </div>
      {open && item.items.length > 0 && (
        <OutlineList items={item.items} onGo={onGo} depth={depth + 1} />
      )}
    </li>
  );
}
