"use client";

import { useStore } from "@nanostores/react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PiSpinner } from "react-icons/pi";
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  TemplateDocument,
} from "@/components/create/template-page";
import { KIND, KINDS } from "@/components/home/kind";
import { fitScale, StaticSlide, useSize } from "@/components/slides/slide-view";
import { createDeckFromTemplate } from "@/components/slides/template-gallery";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  TEMPLATE_CATEGORIES as DOC_CATEGORIES,
  TEMPLATES as DOC_TEMPLATES,
} from "@/data/templates";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useCreateFile } from "@/hooks/use-create-file";
import { type CreatableKind as FileKind, fileHref } from "@/lib/files";
import { type CellValue, displayValue } from "@/lib/sheet/grid";
import {
  getSheetTemplate,
  SHEET_TEMPLATE_CATEGORIES,
  SHEET_TEMPLATES,
  sheetTemplateData,
} from "@/lib/sheet/templates";
import {
  TEMPLATE_CATEGORIES as SLIDE_CATEGORIES,
  TEMPLATES as SLIDE_TEMPLATES,
  type SlideTemplate,
} from "@/lib/slides/templates";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { $auth } from "@/state/auth";

/** One gallery entry, whatever its kind. */
interface Item {
  id: string;
  kind: FileKind;
  name: string;
  description: string;
  category: string;
  search: string;
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
  })),
  sheet: SHEET_TEMPLATES.map((t) => ({
    id: t.id,
    kind: "sheet",
    name: t.name,
    description: t.description,
    category: t.category,
    search: searchText(t.name, t.description, t.category, t.tags),
  })),
  slides: SLIDE_TEMPLATES.map((t) => ({
    id: t.id,
    kind: "slides",
    name: t.name,
    description: t.description,
    category: t.category,
    search: searchText(t.name, t.description, t.category),
  })),
};

/** Each list is in gallery order; its first entries are the featured row. */
const FEATURED = 6;

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

/** Lays out `children` at a fixed design width and zooms them to the container's width. */
function FitWidth({
  width,
  children,
  className,
}: {
  width: number;
  children: ReactNode;
  className?: string;
}) {
  const [ref, { w }] = useSize<HTMLDivElement>();
  return (
    <div ref={ref} className={className}>
      {w > 0 && <div style={{ width, zoom: w / width }}>{children}</div>}
    </div>
  );
}

const docContent = (id: string) =>
  DOC_TEMPLATES.find((t) => t.id === id)?.content ?? "";

/** The real document page, scaled to the card. Hovering scrolls down the page to show what is below the fold. */
function DocPreview({ id, hover }: { id: string; hover: boolean }) {
  const [ref, { w }] = useSize<HTMLDivElement>();
  const [viewRef, inView] = useInView<HTMLDivElement>();
  const scale = w / PAGE_WIDTH;
  return (
    <div ref={viewRef} className="absolute inset-x-[10%] top-[8%] bottom-0">
      <div
        ref={ref}
        className="h-full overflow-hidden rounded-t-[5px] bg-paper shadow-paper"
        aria-hidden="true"
      >
        {inView && scale > 0 && (
          <div
            className="pointer-events-none origin-top-left select-none transition-transform duration-[1600ms] ease-in-out motion-reduce:transition-none"
            style={{
              transform: `translateY(${hover ? -PAGE_HEIGHT * scale * 0.35 : 0}px) scale(${scale})`,
            }}
          >
            <TemplateDocument
              content={docContent(id)}
              className="min-h-[1056px]"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Sheet previews: the built workbook (styles and cached formula values), drawn as a static grid.
// ---------------------------------------------------------------------------------------------

type Workbook = NonNullable<ReturnType<typeof sheetTemplateData>>;
const workbooks = new Map<string, Workbook>();
const workbookOf = (id: string) => {
  let wb = workbooks.get(id);
  if (!wb) {
    wb = sheetTemplateData(id) as Workbook;
    workbooks.set(id, wb);
  }
  return wb;
};

interface CellStyle {
  bl?: number;
  fs?: number;
  bg?: { rgb: string };
  cl?: { rgb: string };
  n?: { pattern: string };
  bd?: { t?: { s: number; cl: { rgb: string } } };
}

/** Enough of the sheet number formats for a preview. */
function formatValue(v: CellValue, pattern?: string): string {
  if (typeof v !== "number" || !pattern) return displayValue(v);
  const prefix = /^[$€£]/.exec(pattern)?.[0] ?? "";
  const body = pattern.slice(prefix.length);
  const decimals = (body.split(".")[1] ?? "").replace("%", "").length;
  if (body.endsWith("%")) return `${(v * 100).toFixed(decimals)}%`;
  const day = new Date(Date.UTC(1899, 11, 30) + Math.round(v * 86_400_000));
  if (body === "yyyy-mm-dd") return day.toISOString().slice(0, 10);
  if (body === "mmm d")
    return day.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  if (body === "hh:mm") return day.toISOString().slice(11, 16);
  const text = Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: body.startsWith("#,##0"),
  });
  return `${v < 0 ? "-" : ""}${prefix}${text}`;
}

const ROW_H = 24;

/** The top-left of a template's sheet at real size: column widths, fills, bold, rules and values. */
function SheetGrid({
  id,
  sheet = 0,
  rows,
  cols,
}: {
  id: string;
  sheet?: number;
  rows: number;
  cols: number;
}) {
  const wb = workbookOf(id);
  const spec = getSheetTemplate(id)?.sheets[sheet];
  const data = wb.sheets[wb.sheetOrder[sheet]];
  const styles = (wb.styles ?? {}) as Record<string, CellStyle>;
  const rowData = (data.rowData ?? {}) as Record<number, { h?: number }>;
  const widths = Array.from(
    { length: cols },
    (_, c) => spec?.widths?.[c] ?? 100,
  );
  const value = (r: number, c: number) =>
    (data.cellData?.[r]?.[c]?.v ?? null) as CellValue;
  return (
    <div
      className="grid bg-white text-[12px] leading-none text-[#1D1D1F] tabular-nums"
      style={{
        gridTemplateColumns: widths.map((w) => `${w}px`).join(" "),
        gridTemplateRows: Array.from(
          { length: rows },
          (_, r) => `${rowData[r]?.h ?? ROW_H}px`,
        ).join(" "),
      }}
    >
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const cell = data.cellData?.[r]?.[c];
        const s = cell?.s ? styles[cell.s as string] : undefined;
        const v = value(r, c);
        const spill =
          typeof v === "string" && c + 1 < cols && value(r, c + 1) === null;
        const top = s?.bd?.t;
        const css: CSSProperties = {
          background: s?.bg?.rgb,
          color: s?.cl?.rgb,
          fontWeight: s?.bl ? 650 : undefined,
          fontSize: s?.fs ? `${s.fs}px` : undefined,
          borderTop: top
            ? `${top.s >= 8 ? 2 : 1}px solid ${top.cl.rgb}`
            : undefined,
        };
        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static grid
            key={i}
            style={css}
            className={cn(
              "flex items-center whitespace-nowrap border-r border-b border-black/[0.07] px-1.5",
              typeof v === "number" && "justify-end",
              spill ? "relative z-[1] overflow-visible" : "overflow-hidden",
            )}
          >
            {formatValue(v, s?.n?.pattern)}
          </div>
        );
      })}
    </div>
  );
}

/** Columns that fit in about `budget` px of the sheet's width. */
const colsFor = (id: string, budget: number) => {
  const widths = getSheetTemplate(id)?.sheets[0].widths ?? [];
  let total = 0;
  let n = 0;
  while (total < budget && n < 26) total += widths[n++] ?? 100;
  return n;
};

const SHEET_CARD_W = 720;

function SheetPreview({ id }: { id: string }) {
  const [viewRef, inView] = useInView<HTMLDivElement>();
  return (
    <div
      ref={viewRef}
      className="absolute inset-x-[6%] top-[8%] bottom-0 overflow-hidden rounded-t-[5px] bg-white shadow-paper"
      aria-hidden="true"
    >
      {inView && (
        <FitWidth
          width={SHEET_CARD_W}
          className="pointer-events-none select-none"
        >
          <SheetGrid id={id} rows={20} cols={colsFor(id, SHEET_CARD_W)} />
        </FitWidth>
      )}
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

const slideTemplate = (id: string) => SLIDE_TEMPLATES.find((t) => t.id === id);

function Thumbnail({ item, hover }: { item: Item; hover: boolean }) {
  if (item.kind === "doc") return <DocPreview id={item.id} hover={hover} />;
  if (item.kind === "sheet") return <SheetPreview id={item.id} />;
  const t = slideTemplate(item.id);
  return t ? <SlidesPreview template={t} hover={hover} /> : null;
}

// ---------------------------------------------------------------------------------------------
// Cards and quick look
// ---------------------------------------------------------------------------------------------

function Card({
  title,
  description,
  kind,
  busy,
  disabled,
  large,
  onClick,
  onPreview,
  children,
}: {
  title: string;
  description: string;
  kind: FileKind;
  busy: boolean;
  disabled: boolean;
  large?: boolean;
  onClick: () => void;
  onPreview?: () => void;
  children: (hover: boolean) => ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover only drives the thumbnail animation
    <div
      className="group relative min-w-0 rounded-[14px] transition-transform duration-200 ease-[cubic-bezier(.2,.9,.3,1.2)] hover:-translate-y-0.5 motion-reduce:transition-none"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === " " && onPreview) {
            e.preventDefault();
            onPreview();
          }
        }}
        disabled={disabled}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        aria-label={`${title}: ${description}`}
        aria-keyshortcuts={onPreview ? "Space" : undefined}
        className="block w-full rounded-[14px] text-left outline-none disabled:cursor-default"
      >
        <div className="overflow-hidden rounded-[14px] bg-card shadow-card transition-shadow duration-200 group-hover:shadow-card-hover group-focus-visible:ring-[3px] group-focus-visible:ring-ring group-has-[:disabled]:opacity-70">
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
          <div className={cn("px-3.5 py-3", large && "px-4 py-3.5")}>
            <h3
              className={cn(
                "truncate font-display font-semibold tracking-[-0.01em] text-foreground",
                large ? "text-[17px]" : "text-[15px]",
              )}
            >
              {title}
            </h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </button>
      {onPreview && (
        <button
          type="button"
          tabIndex={-1}
          onClick={onPreview}
          className="press absolute top-2.5 right-2.5 flex h-7 items-center gap-1.5 rounded-full bg-card/95 px-2.5 text-xs font-medium text-foreground opacity-0 shadow-float transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-card focus-visible:opacity-100"
        >
          <Eye className="size-3.5" />
          Preview
        </button>
      )}
    </div>
  );
}

function SlideThumb({
  template,
  index,
}: {
  template: SlideTemplate;
  index: number;
}) {
  const [ref, { w }] = useSize<HTMLDivElement>();
  const slide = template.deck.slides[index];
  return (
    <div
      ref={ref}
      className="relative aspect-video overflow-hidden rounded-[8px] shadow-paper"
    >
      {w > 0 && slide && (
        <StaticSlide
          slide={slide}
          theme={template.deck.theme}
          scale={fitScale(w, (w * 9) / 16)}
          className="pointer-events-none"
        />
      )}
    </div>
  );
}

/** The large preview inside quick look. */
function LargePreview({ item }: { item: Item }) {
  if (item.kind === "doc")
    return (
      <FitWidth
        width={PAGE_WIDTH}
        className="mx-auto w-full max-w-[720px] overflow-hidden rounded-[4px] shadow-paper"
      >
        <TemplateDocument
          content={docContent(item.id)}
          className="min-h-[1056px]"
        />
      </FitWidth>
    );
  if (item.kind === "sheet") {
    const sheets = getSheetTemplate(item.id)?.sheets ?? [];
    return (
      <div className="flex flex-col gap-6">
        {sheets.map((s, i) => (
          <figure key={s.name} className="m-0">
            {sheets.length > 1 && (
              <figcaption className="mb-2 text-xs font-medium text-muted-foreground">
                {s.name}
              </figcaption>
            )}
            <FitWidth
              width={980}
              className="overflow-hidden rounded-[4px] bg-white shadow-paper"
            >
              <SheetGrid
                id={item.id}
                sheet={i}
                rows={Math.min(30, s.rows.length + 4)}
                cols={Math.max(colsFor(item.id, 980), s.rows[0]?.length ?? 0)}
              />
            </FitWidth>
          </figure>
        ))}
      </div>
    );
  }
  const t = slideTemplate(item.id);
  if (!t) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {t.deck.slides.map((s, i) => (
        <SlideThumb key={s.id ?? i} template={t} index={i} />
      ))}
    </div>
  );
}

function QuickLook({
  items,
  index,
  onIndex,
  onClose,
  onUse,
  busy,
}: {
  items: Item[];
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
  onUse: (item: Item) => void;
  busy: boolean;
}) {
  const item = index === null ? null : items[index];
  const scroller = useRef<HTMLDivElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to top whenever the template changes
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [item?.id]);
  if (!item || index === null) return null;
  const move = (d: number) =>
    onIndex((index + d + items.length) % items.length);
  const Icon = KIND[item.kind].icon;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            move(e.key === "ArrowRight" ? 1 : -1);
          }
        }}
        className="flex h-[min(90dvh,960px)] w-[min(1080px,calc(100%-2rem))] max-w-none flex-col gap-0 overflow-hidden rounded-[18px] border border-border bg-card p-0 shadow-float sm:max-w-none"
      >
        <div className="flex items-start gap-3 border-b border-border px-5 py-4 pr-14">
          <Icon className={cn("mt-1 size-4 shrink-0", KIND[item.kind].text)} />
          <div className="min-w-0">
            <DialogTitle className="font-display text-lg font-semibold tracking-[-0.015em]">
              {item.name}
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-[13px]">
              {item.description}
            </DialogDescription>
          </div>
        </div>
        <div
          ref={scroller}
          className="min-h-0 flex-1 overflow-y-auto bg-background px-5 py-6 md:px-10"
        >
          <LargePreview item={item} />
        </div>
        <div className="flex items-center gap-2 border-t border-border px-5 py-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous template"
            title="Previous template"
            onClick={() => move(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next template"
            title="Next template"
            onClick={() => move(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">
            {index + 1} of {items.length}
          </span>
          <Button
            className="ml-auto"
            disabled={busy}
            onClick={() => onUse(item)}
          >
            {busy && <PiSpinner className="size-4 animate-spin" />}
            Use template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Data for a new file from a template, by kind. Docs carry HTML; sheets and slides carry their snapshot. */
function templatePayload(
  item: Item,
): { initialContent?: string; data?: unknown } | null {
  if (item.kind === "doc") {
    const content = docContent(item.id);
    return content ? { initialContent: content } : null;
  }
  const data =
    item.kind === "sheet"
      ? sheetTemplateData(item.id)
      : createDeckFromTemplate(item.id);
  return data ? { data } : null;
}

/**
 * Every template in one place: Documents / Spreadsheets / Presentations, a featured row, category
 * chips, search, live thumbnails and quick look (Preview or Space; arrows move, Esc closes).
 * Picking one creates the file (in `folderId`, default the user's root) and opens it.
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
  const [preview, setPreview] = useState<number | null>(null);
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
  const showFeatured = category === "All" && !q;
  const featured = showFeatured ? shown.slice(0, FEATURED) : [];
  const rest = showFeatured ? shown.slice(FEATURED) : shown;

  const switchKind = (next: FileKind) => {
    setKind(next);
    setCategory("All");
    setPreview(null);
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

  const card = (item: Item, large?: boolean) => (
    <Card
      key={`${item.kind}:${item.id}`}
      kind={item.kind}
      title={item.name}
      description={item.description}
      busy={pending === item.id}
      disabled={busy}
      large={large}
      onClick={() => pick(item)}
      onPreview={() => setPreview(shown.indexOf(item))}
    >
      {(hover) => <Thumbnail item={item} hover={hover} />}
    </Card>
  );

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

        <div role="tabpanel">
          {featured.length > 0 && (
            <section aria-labelledby="featured-heading" className="mt-7">
              <h2
                id="featured-heading"
                className="font-display text-[17px] font-semibold tracking-[-0.015em]"
              >
                Featured
              </h2>
              <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
                {featured.map((item) => card(item, true))}
              </div>
              <h2 className="mt-10 font-display text-[17px] font-semibold tracking-[-0.015em]">
                All {KIND[kind].plural.toLowerCase()}
              </h2>
            </section>
          )}

          <div
            className={cn(
              "grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-5",
              featured.length ? "mt-3" : "mt-6",
            )}
          >
            {showFeatured && (
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
            {rest.map((item) => card(item))}
          </div>
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

      <QuickLook
        items={shown}
        index={preview !== null && preview < shown.length ? preview : null}
        onIndex={setPreview}
        onClose={() => setPreview(null)}
        onUse={pick}
        busy={busy}
      />
    </div>
  );
}
