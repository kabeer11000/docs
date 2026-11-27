"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Deck } from "@/lib/slides/model";
import { templateDeck } from "@/lib/slides/template-utils";
import {
  type SlideTemplate,
  TEMPLATE_CATEGORIES,
  TEMPLATES,
} from "@/lib/slides/templates";
import { cn } from "@/lib/utils";
import { fitScale, StaticSlide, useSize } from "./slide-view";

/** A new deck from a template (fresh ids), or null for an unknown id. For "New presentation from template". */
export function createDeckFromTemplate(templateId: string): Deck | null {
  return templateDeck(templateId);
}

const FLIP_MS = 900;

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setInView(true),
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);
  return [ref, inView] as const;
}

const TemplateCard = memo(function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: SlideTemplate;
  selected: boolean;
  onSelect: (t: SlideTemplate) => void;
}) {
  const [viewRef, inView] = useInView<HTMLButtonElement>();
  const [sizeRef, { w }] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState(false);
  const [index, setIndex] = useState(0);
  const slides = template.deck.slides;

  useEffect(() => {
    if (
      !hover ||
      slides.length < 2 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const t = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      FLIP_MS,
    );
    return () => clearInterval(t);
  }, [hover, slides.length]);

  const slide = slides[Math.min(index, slides.length - 1)];

  return (
    <button
      ref={viewRef}
      type="button"
      onClick={() => onSelect(template)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setIndex(0);
      }}
      onFocus={() => setHover(true)}
      onBlur={() => {
        setHover(false);
        setIndex(0);
      }}
      aria-pressed={selected}
      aria-label={`${template.name}, ${slides.length} slides`}
      className={cn(
        "press group flex flex-col gap-3 rounded-[14px] bg-card p-3 text-left shadow-card outline-none transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-app",
        selected && "ring-2 ring-app",
      )}
    >
      <div
        ref={sizeRef}
        className="relative aspect-video w-full overflow-hidden rounded-[10px] bg-muted"
      >
        {inView && w > 0 && slide && (
          <StaticSlide
            slide={slide}
            theme={template.deck.theme}
            scale={fitScale(w, (w * 9) / 16)}
            className="pointer-events-none"
          />
        )}
        {slides.length > 1 && (
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1 transition-opacity duration-150",
              hover ? "opacity-100" : "opacity-0",
            )}
          >
            {slides.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  "size-1.5 rounded-full bg-foreground/30 shadow-sm",
                  i === index && "bg-app",
                )}
              />
            ))}
          </div>
        )}
      </div>
      <div className="min-w-0 px-1 pb-1">
        <div className="truncate font-display text-[15px] font-semibold tracking-tight">
          {template.name}
        </div>
        <div className="mt-0.5 text-[13px] text-muted-foreground">
          {slides.length} slides, {template.category}
        </div>
      </div>
    </button>
  );
});

export function SlidesTemplateGallery({
  open,
  onOpenChange,
  onPick,
  canInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (
    deck: Deck,
    mode: "replace" | "insert",
    template: SlideTemplate,
  ) => void;
  canInsert: boolean;
}) {
  const [category, setCategory] = useState<string>("All");
  const [selected, setSelected] = useState<SlideTemplate | null>(null);
  const shown = useMemo(
    () =>
      category === "All"
        ? TEMPLATES
        : TEMPLATES.filter((t) => t.category === category),
    [category],
  );

  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  const pick = (mode: "replace" | "insert") => {
    if (!selected) return;
    const deck = templateDeck(selected.id);
    if (!deck) return;
    onPick(deck, mode, selected);
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          data-app="slides"
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col bg-background text-foreground outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          <header className="flex shrink-0 items-center gap-4 px-6 pt-5 pb-3 sm:px-10">
            <DialogPrimitive.Title className="font-display text-2xl font-bold tracking-[-0.02em]">
              Templates
            </DialogPrimitive.Title>
            <fieldset
              aria-label="Categories"
              className="m-0 flex min-w-0 flex-1 gap-1.5 overflow-x-auto border-0 p-0 py-1"
            >
              {["All", ...TEMPLATE_CATEGORIES].map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "press h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-app",
                    category === c
                      ? "bg-app text-app-foreground"
                      : "bg-card text-muted-foreground shadow-card hover:text-foreground",
                  )}
                >
                  {c}
                </button>
              ))}
            </fieldset>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogPrimitive.Close asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Close templates"
                  >
                    <X />
                  </Button>
                </DialogPrimitive.Close>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close</TooltipContent>
            </Tooltip>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-2 pb-28 sm:px-10">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
              {shown.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  selected={selected?.id === t.id}
                  onSelect={setSelected}
                />
              ))}
            </div>
          </div>

          {selected && (
            <div className="pointer-events-none fixed inset-x-0 bottom-5 flex justify-center px-4">
              <div className="pointer-events-auto flex max-w-2xl items-center gap-4 rounded-[14px] bg-popover py-3 pr-3 pl-5 shadow-float animate-in fade-in-0 slide-in-from-bottom-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-[15px] font-semibold">
                    {selected.name}
                  </div>
                  <div className="truncate text-[13px] text-muted-foreground">
                    {selected.description}
                  </div>
                </div>
                {canInsert ? (
                  <>
                    <Button variant="outline" onClick={() => pick("insert")}>
                      Add after current slide
                    </Button>
                    <Button variant="app" onClick={() => pick("replace")}>
                      Replace my slides
                    </Button>
                  </>
                ) : (
                  <Button variant="app" onClick={() => pick("replace")}>
                    Use template
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
