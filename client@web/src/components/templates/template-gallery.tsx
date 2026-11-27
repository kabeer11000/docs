"use client";

import { useStore } from "@nanostores/react";
import { ArrowLeft, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { PiSpinner } from "react-icons/pi";
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  TemplateDocument,
} from "@/components/create/template-page";
import { KIND, KINDS } from "@/components/home/kind";
import { fitScale, StaticSlide, useSize } from "@/components/slides/slide-view";
import { createDeckFromTemplate } from "@/components/slides/template-gallery";
import { Input } from "@/components/ui/input";
import {
  TEMPLATE_CATEGORIES as DOC_CATEGORIES,
  TEMPLATES as DOC_TEMPLATES,
} from "@/data/templates";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useCreateFile } from "@/hooks/use-create-file";
import { type FileKind, fileHref } from "@/lib/files";
import { displayValue } from "@/lib/sheet/grid";
import {
  SHEET_TEMPLATE_CATEGORIES,
  SHEET_TEMPLATES,
  sheetTemplateData,
} from "@/lib/sheet/templates";
import { parseCell, type SheetSpec } from "@/lib/sheet/templates/build";
import {
  TEMPLATE_CATEGORIES as SLIDE_CATEGORIES,
  TEMPLATES as SLIDE_TEMPLATES,
  type SlideTemplate,
} from "@/lib/slides/templates";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { $auth } from "@/state/auth";

/** One gallery entry, whatever its kind. `preview` renders the live thumbnail. */
interface Item {
  id: string;
  kind: FileKind;
  name: string;
  description: string;
  category: string;
  search: string;
  preview: (hover: boolean) => ReactNode;
}

const searchText = (...parts: Array<string | string[] | undefined>) =>
  parts.flat().filter(Boolean).join(" ").toLowerCase();

const ITEMS: Record<FileKind, Item[]> = {
  doc: DOC_TEMPLATES.map((t) => ({
    id: t.id,
    kind: "doc",
    name: t.name,
    description: t.description,
    category: t.category,
    search: searchText(t.name, t.description, t.category, t.tags),
    preview: (hover) => <DocPreview content={t.content} hover={hover} />,
  })),
  sheet: SHEET_TEMPLATES.map((t) => ({
    id: t.id,
    kind: "sheet",
    name: t.name,
    description: t.description,
    category: t.category,
    search: searchText(t.name, t.description, t.category, t.tags),
    preview: () => <SheetPreview spec={t.sheets[0]} />,
  })),
  slides: SLIDE_TEMPLATES.map((t) => ({
    id: t.id,
    kind: "slides",
    name: t.name,
    description: t.description,
    category: t.category,
    search: searchText(t.name, t.description, t.category),
    preview: (hover) => <SlidesPreview template={t} hover={hover} />,
  })),
};

const CATEGORIES: Record<FileKind, readonly string[]> = {
  doc: DOC_CATEGORIES,
  sheet: SHEET_TEMPLATE_CATEGORIES,
  slides: SLIDE_CATEGORIES,
};

/** Thumbnail well shape per kind: pages and grids are 4:3 cards, slides are 16:9. */
const WELL: Record<FileKind, string> = {
  doc: "aspect-[4/3]",
  sheet: "aspect-[4/3]",
  slides: "aspect-video",
};

const isKind = (k: string | null): k is FileKind =>
  !!k && (KINDS as string[]).includes(k);

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

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The real document page, scaled to the card. Hovering scrolls down the page to show what is below the fold. */
function DocPreview({ content, hover }: { content: string; hover: boolean }) {
  const [ref, { w }] = useSize<HTMLDivElement>();
  const [viewRef, inView] = useInView<HTMLDivElement>();
  const scale = w / PAGE_WIDTH;
  return (
    <div ref={viewRef} className="absolute inset-x-[12%] top-[10%] bottom-0">
      <div
        ref={ref}
        className="h-full overflow-hidden rounded-t-[5px] bg-paper text-paper-foreground shadow-paper"
        aria-hidden="true"
      >
        {inView && scale > 0 && (
          <div
            className="pointer-events-none origin-top-left select-none transition-transform duration-[1600ms] ease-in-out motion-reduce:transition-none"
            style={{
              transform: `translateY(${hover ? -PAGE_HEIGHT * scale * 0.4 : 0}px) scale(${scale})`,
              height: PAGE_HEIGHT,
            }}
          >
            <TemplateDocument content={content} className="h-full" />
          </div>
        )}
      </div>
    </div>
  );
}

const PREVIEW_ROWS = 14;
const PREVIEW_COLS = 7;

/** Number format of a cell from the template's [range, pattern] list (last match wins). */
function formatOf(spec: SheetSpec, r: number, c: number): string | undefined {
  let pattern: string | undefined;
  for (const [range, p] of spec.formats ?? []) {
    const [a, b = a] = range.split(":");
    const [r1, c1] = parseCell(a);
    const [r2, c2] = parseCell(b);
    if (r >= r1 && r <= r2 && c >= c1 && c <= c2) pattern = p;
  }
  return pattern;
}

/** Enough of the sheet number formats for a thumbnail. */
function formatValue(v: unknown, pattern?: string): string {
  if (typeof v !== "number" || !pattern)
    return displayValue((v ?? null) as string | number | boolean | null);
  const decimals = (pattern.split(".")[1] ?? "").replace("%", "").length;
  if (pattern.endsWith("%")) return `${(v * 100).toFixed(decimals)}%`;
  const day = new Date(Date.UTC(1899, 11, 30) + Math.round(v * 86_400_000));
  if (pattern === "yyyy-mm-dd") return day.toISOString().slice(0, 10);
  if (pattern === "mmm d")
    return day.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  if (pattern === "hh:mm") return day.toISOString().slice(11, 16);
  if (pattern.startsWith("#,##0"))
    return v.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  return v.toFixed(decimals);
}

/** The top-left of the first sheet as a tiny real grid, with the template's column widths and header row. */
function SheetPreview({ spec }: { spec: SheetSpec }) {
  const widths = Array.from(
    { length: PREVIEW_COLS },
    (_, c) => spec.widths?.[c] ?? 100,
  );
  const header = new Set(spec.header ?? [0]);
  const bold = new Set<string>();
  for (const range of [...(spec.bold ?? []), ...(spec.title ?? [])]) {
    const [a, b = a] = range.split(":");
    const [r1, c1] = parseCell(a);
    const [r2, c2] = parseCell(b);
    for (let r = r1; r <= Math.min(r2, PREVIEW_ROWS); r++)
      for (let c = c1; c <= Math.min(c2, PREVIEW_COLS); c++)
        bold.add(`${r},${c}`);
  }
  return (
    <div className="absolute inset-x-[7%] [container-type:size] top-[9%] bottom-0 overflow-hidden rounded-t-[5px] bg-paper text-paper-foreground shadow-paper">
      <div
        className="pointer-events-none grid select-none text-[2.4cqw] leading-none tabular-nums"
        style={{
          gridTemplateColumns: widths.map((w) => `${w}fr`).join(" "),
          gridAutoRows: `${100 / PREVIEW_ROWS}cqh`,
        }}
        aria-hidden="true"
      >
        {Array.from({ length: PREVIEW_ROWS * PREVIEW_COLS }, (_, i) => {
          const r = Math.floor(i / PREVIEW_COLS);
          const c = i % PREVIEW_COLS;
          const raw = spec.rows[r]?.[c] ?? null;
          const formula = typeof raw === "string" && raw.startsWith("=");
          const isHeader = header.has(r) && raw !== null && raw !== "";
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static grid
              key={i}
              className={cn(
                "flex items-center overflow-hidden whitespace-nowrap border-r border-b border-paper-foreground/[0.08] px-[0.9cqw]",
                typeof raw === "number" && "justify-end",
                isHeader && "bg-paper-foreground/[0.06] font-semibold",
                bold.has(`${r},${c}`) && "font-semibold",
              )}
            >
              {formula ? (
                <span className="h-[0.9cqw] w-3/5 rounded-full bg-paper-foreground/[0.12]" />
              ) : (
                formatValue(raw, formatOf(spec, r, c))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const FLIP_MS = 900;

/** The first slide; hovering flips through the deck. */
function SlidesPreview({
  template,
  hover,
}: {
  template: SlideTemplate;
  hover: boolean;
}) {
  const [viewRef, inView] = useInView<HTMLDivElement>();
  const [sizeRef, { w }] = useSize<HTMLDivElement>();
  const [index, setIndex] = useState(0);
  const slides = template.deck.slides;

  useEffect(() => {
    if (!hover || slides.length < 2 || reducedMotion()) {
      setIndex(0);
      return;
    }
    const t = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      FLIP_MS,
    );
    return () => clearInterval(t);
  }, [hover, slides.length]);

  const slide = slides[Math.min(index, slides.length - 1)];
  return (
    <div ref={viewRef} className="absolute inset-[7%]">
      <div
        ref={sizeRef}
        className="relative h-full overflow-hidden rounded-[6px] shadow-paper"
      >
        {inView && w > 0 && slide && (
          <StaticSlide
            slide={slide}
            theme={template.deck.theme}
            scale={fitScale(w, (w * 9) / 16)}
            className="pointer-events-none"
          />
        )}
      </div>
    </div>
  );
}

function Card({
  title,
  description,
  kind,
  busy,
  disabled,
  onClick,
  children,
}: {
  title: string;
  description: string;
  kind: FileKind;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
  children: (hover: boolean) => ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      aria-label={`${title}: ${description}`}
      className="group min-w-0 rounded-[14px] text-left outline-none disabled:cursor-default"
    >
      <div className="lift overflow-hidden rounded-[14px] bg-card shadow-card group-focus-visible:ring-[3px] group-focus-visible:ring-ring group-disabled:opacity-70">
        <div
          className={cn(
            "relative overflow-hidden border-b border-border bg-background",
            WELL[kind],
          )}
        >
          {children(hover)}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <PiSpinner className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="px-3.5 py-3">
          <h3 className="truncate font-display text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            {title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

/** Data for a new file from a template, by kind. Docs carry HTML; sheets and slides carry their snapshot. */
function templatePayload(
  item: Item,
): { initialContent?: string; data?: unknown } | null {
  if (item.kind === "doc") {
    const content = DOC_TEMPLATES.find((t) => t.id === item.id)?.content;
    return content ? { initialContent: content } : null;
  }
  const data =
    item.kind === "sheet"
      ? sheetTemplateData(item.id)
      : createDeckFromTemplate(item.id);
  return data ? { data } : null;
}

/**
 * Every template in one place: Documents / Spreadsheets / Presentations, category chips, search and live
 * thumbnails. Picking one creates the file (in `folderId`, default the user's root) and opens it.
 */
export function TemplateGallery({
  initialKind = "doc",
  folderId,
}: {
  initialKind?: string | null;
  folderId?: string | null;
}) {
  const router = useRouter();
  const { user } = useStore($auth);
  const { createDocument } = useCloudStore();
  const { create, creating } = useCreateFile();
  const [kind, setKind] = useState<FileKind>(
    isKind(initialKind) ? initialKind : "doc",
  );
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const parent = folderId || user?.id;

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      Object.fromEntries(
        KINDS.map((k) => [
          k,
          q ? ITEMS[k].filter((i) => i.search.includes(q)) : ITEMS[k],
        ]),
      ) as Record<FileKind, Item[]>,
    [q],
  );
  const shown =
    category === "All"
      ? matches[kind]
      : matches[kind].filter((i) => i.category === category);

  const switchKind = (next: FileKind) => {
    setKind(next);
    setCategory("All");
    const params = new URLSearchParams(window.location.search);
    params.set("kind", next);
    window.history.replaceState(null, "", `?${params}`);
  };

  const pick = async (item: Item) => {
    if (!user || pending) return;
    const payload = templatePayload(item);
    if (!payload) return;
    setPending(item.id);
    try {
      const id = await createDocument({
        kind: item.kind,
        title: item.name,
        folderId: parent || user.id,
        ...payload,
      });
      if (!id) throw new Error("create failed");
      router.push(fileHref(id, item.kind));
    } catch {
      showToast.error(
        "Could not create the file",
        "Check your connection and try again.",
      );
      setPending(null);
    }
  };

  const busy = !!pending || creating || !user;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-3 px-4 md:px-10">
          <Link
            href="/home"
            aria-label="Back to home"
            title="Back to home"
            className="press flex size-8 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring outline-none"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="font-display text-lg font-bold tracking-[-0.02em]">
            Templates
          </h1>
          <div className="relative ml-auto w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates"
              aria-label="Search templates"
              className="pl-8"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 pt-6 pb-20 md:px-10 md:pt-8">
        <div
          role="tablist"
          aria-label="File type"
          className="flex gap-6 border-b border-border"
        >
          {KINDS.map((k) => {
            const { icon: Icon, plural, text, bg } = KIND[k];
            const active = k === kind;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => switchKind(k)}
                className={cn(
                  "relative -mb-px flex h-10 items-center gap-2 text-sm font-medium outline-none transition-colors focus-visible:text-foreground",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("size-4", active && text)} />
                {plural}
                <span className="text-xs tabular-nums text-muted-foreground">
                  {matches[k].length}
                </span>
                {active && (
                  <span
                    className={cn(
                      "absolute inset-x-0 bottom-0 h-0.5 rounded-full",
                      bg,
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        <fieldset
          aria-label="Categories"
          className="m-0 mt-4 flex min-w-0 gap-1.5 overflow-x-auto border-0 p-0 py-1"
        >
          {["All", ...CATEGORIES[kind]].map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                "press h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                category === c
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground shadow-card hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </fieldset>

        <div
          role="tabpanel"
          className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-5"
        >
          {category === "All" && !q && (
            <Card
              kind={kind}
              title={`Blank ${KIND[kind].label.toLowerCase()}`}
              description={KIND[kind].blank}
              busy={creating}
              disabled={busy}
              onClick={() => create(kind, parent ?? undefined)}
            >
              {() => (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className={cn(
                      "flex size-12 items-center justify-center rounded-full text-app-foreground shadow-card transition-transform duration-200 group-hover:scale-110",
                      KIND[kind].bg,
                    )}
                  >
                    <Plus className="size-5" strokeWidth={2.5} />
                  </span>
                </div>
              )}
            </Card>
          )}
          {shown.map((item) => (
            <Card
              key={`${item.kind}:${item.id}`}
              kind={item.kind}
              title={item.name}
              description={item.description}
              busy={pending === item.id}
              disabled={busy}
              onClick={() => pick(item)}
            >
              {item.preview}
            </Card>
          ))}
        </div>

        {shown.length === 0 && (
          <div className="py-20 text-center">
            <p className="font-display text-lg font-semibold">
              No templates match
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {KINDS.some((k) => k !== kind && matches[k].length)
                ? "Try another tab, or a different search."
                : "Try a different search."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
