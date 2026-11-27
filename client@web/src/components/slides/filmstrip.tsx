"use client";

import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

const THUMB_W = 168;
const mod = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "Cmd" : "Ctrl";

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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const ids = deck.slides.map((s) => s.id);
  const index = ids.indexOf(currentId);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) actions.move(String(active.id), ids.indexOf(String(over.id)));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.slideId) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = ids[Math.max(0, Math.min(ids.length - 1, index + (e.key === "ArrowDown" ? 1 : -1)))];
      if (next) actions.select(next);
    } else if ((e.key === "Delete" || e.key === "Backspace") && canEdit && ids.length > 1) {
      e.preventDefault();
      actions.remove(currentId);
    }
  };

  return (
    <nav aria-label="Slides" className="w-[228px] shrink-0 overflow-y-auto border-r border-border py-3 pr-3 pl-2" onKeyDown={onKeyDown}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2">
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id, disabled: !canEdit });
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (active) buttonRef.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("flex items-start gap-2", isDragging && "relative z-10 opacity-80")}
    >
      <span className={cn("w-5 pt-1 text-right text-xs tabular-nums", active ? "text-foreground" : "text-muted-foreground")}>{number}</span>
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
              "block rounded-[2px] shadow-paper outline-none transition-shadow duration-150 focus-visible:ring-2 focus-visible:ring-ring",
              active ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:ring-1 hover:ring-border",
            )}
          >
            <StaticSlide slide={slide} theme={theme} scale={THUMB_W / 1280} className="pointer-events-none rounded-[2px]" />
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <ContextMenuItem disabled={!canEdit} onSelect={() => actions.insertAfter(slide.id)}>
            New slide after
            <ContextMenuShortcut>{mod}+Enter</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem disabled={!canEdit} onSelect={() => actions.duplicate(slide.id)}>
            Duplicate
            <ContextMenuShortcut>{mod}+D</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem disabled={!canEdit || !canDelete} className="text-destructive focus:bg-destructive/10 data-[highlighted]:bg-destructive/10" onSelect={() => actions.remove(slide.id)}>
            Delete
            <ContextMenuShortcut>Del</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </li>
  );
});
