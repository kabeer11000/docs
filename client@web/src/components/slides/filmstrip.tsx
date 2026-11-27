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
import { Plus } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Deck, Slide, Theme } from "@/lib/slides/model";
import { cn } from "@/lib/utils";
import { StaticSlide } from "./slide-view";

const THUMB_W = 176;
const mod =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
    ? "Cmd"
    : "Ctrl";

export interface FilmstripActions {
  select: (id: string) => void;
  move: (id: string, to: number) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  insertAfter: (id: string) => void;
}

export function Filmstrip({
  deck,
  currentId,
  canEdit,
  actions,
}: {
  deck: Deck;
  currentId: string;
  canEdit: boolean;
  actions: FilmstripActions;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const ids = deck.slides.map((s) => s.id);
  const index = ids.indexOf(currentId);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id)
      actions.move(String(active.id), ids.indexOf(String(over.id)));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.target !== e.currentTarget &&
      !(e.target as HTMLElement).dataset.slideId
    )
      return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next =
        ids[
          Math.max(
            0,
            Math.min(ids.length - 1, index + (e.key === "ArrowDown" ? 1 : -1)),
          )
        ];
      if (next) actions.select(next);
    } else if (
      (e.key === "Delete" || e.key === "Backspace") &&
      canEdit &&
      ids.length > 1
    ) {
      e.preventDefault();
      actions.remove(currentId);
    }
  };

  return (
    <nav
      aria-label="Slides"
      className="w-[236px] shrink-0 overflow-y-auto py-4 pr-3 pl-2"
      onKeyDown={onKeyDown}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol>
            {deck.slides.map((slide, i) => (
              <FilmstripItem
                key={slide.id}
                slide={slide}
                theme={deck.theme}
                number={i + 1}
                active={slide.id === currentId}
                canEdit={canEdit}
                canDelete={ids.length > 1}
                actions={actions}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </nav>
  );
}

const FilmstripItem = memo(function FilmstripItem({
  slide,
  theme,
  number,
  active,
  canEdit,
  canDelete,
  actions,
}: {
  slide: Slide;
  theme: Theme;
  number: number;
  active: boolean;
  canEdit: boolean;
  canDelete: boolean;
  actions: FilmstripActions;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: slide.id,
    disabled: !canEdit,
    transition: { duration: 220, easing: "cubic-bezier(.2,.9,.3,1)" },
  });
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (active)
      buttonRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
  }, [active]);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10")}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "w-5 pt-1 text-right text-xs font-medium tabular-nums",
            active ? "text-app" : "text-muted-foreground",
          )}
        >
          {number}
        </span>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <button
              ref={buttonRef}
              type="button"
              data-slide-id={slide.id}
              aria-label={`Slide ${number}`}
              aria-current={active || undefined}
              {...attributes}
              {...listeners}
              onClick={() => actions.select(slide.id)}
              className={cn(
                "block rounded-[10px] outline-none transition-[box-shadow,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "ring-2 ring-app ring-offset-2 ring-offset-background"
                  : "shadow-card hover:-translate-y-0.5 hover:shadow-card-hover",
                isDragging && "scale-[1.04] shadow-float",
              )}
            >
              <StaticSlide
                slide={slide}
                theme={theme}
                scale={THUMB_W / 1280}
                radius={10}
                className="pointer-events-none"
              />
            </button>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-52">
            <ContextMenuItem
              disabled={!canEdit}
              onSelect={() => actions.insertAfter(slide.id)}
            >
              New slide after
              <ContextMenuShortcut>{mod}+Enter</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem
              disabled={!canEdit}
              onSelect={() => actions.duplicate(slide.id)}
            >
              Duplicate
              <ContextMenuShortcut>{mod}+D</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              disabled={!canEdit || !canDelete}
              className="text-destructive focus:bg-destructive/10 data-[highlighted]:bg-destructive/10"
              onSelect={() => actions.remove(slide.id)}
            >
              Delete
              <ContextMenuShortcut>Del</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
      {/* Hover the gap below a slide to add one right there. */}
      <div className={cn("group relative h-3.5", isDragging && "invisible")}>
        {canEdit && (
          <button
            type="button"
            aria-label={`New slide after slide ${number}`}
            onClick={() => actions.insertAfter(slide.id)}
            className="press absolute top-1/2 left-[calc(50%+14px)] z-10 flex size-6 -translate-x-1/2 -translate-y-1/2 scale-75 items-center justify-center rounded-full bg-app text-app-foreground opacity-0 shadow-float transition-[opacity,transform] duration-150 group-hover:scale-100 group-hover:opacity-100 focus-visible:scale-100 focus-visible:opacity-100"
          >
            <Plus className="size-3.5" />
          </button>
        )}
      </div>
    </li>
  );
});
