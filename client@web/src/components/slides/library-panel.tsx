"use client";

import {
  ChartColumn,
  Image as ImageIcon,
  Palette,
  Plus,
  Search,
  Shapes,
  Smile,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { type CSSProperties, useMemo, useRef, useState } from "react";
import type * as Y from "yjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { patchElement, setBackground } from "@/lib/slides/deck-doc";
import {
  backgroundCss,
  chartSvg,
  iconSvg,
  shapeSvg,
} from "@/lib/slides/elements";
import { ICON_NODES } from "@/lib/slides/icon-data";
import {
  BACKGROUNDS,
  type ChartKind,
  SHAPES,
  type ShapeKind,
  type SlideElement,
  THEMES,
  type Theme,
} from "@/lib/slides/model";
import { FONT_STACK } from "@/lib/slides/styles";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  addChart,
  addIcon,
  addImage,
  addShape,
  addTextBox,
  CHART_PRESETS,
  TEXT_PRESETS,
} from "./element-actions";
import { PALETTE } from "./element-toolbar";
import { Markup } from "./slide-view";

export type LibraryTab =
  | "text"
  | "shapes"
  | "icons"
  | "images"
  | "backgrounds"
  | "charts";

const TABS: { id: LibraryTab; label: string; Icon: typeof Type }[] = [
  { id: "text", label: "Text", Icon: Type },
  { id: "shapes", label: "Shapes", Icon: Shapes },
  { id: "icons", label: "Icons", Icon: Smile },
  { id: "images", label: "Images", Icon: ImageIcon },
  { id: "backgrounds", label: "Backdrop", Icon: Palette },
  { id: "charts", label: "Charts", Icon: ChartColumn },
];

const ICON_NAMES = Object.keys(ICON_NODES);
const SOFT = [
  "#F5F6F8",
  "#FFF0E6",
  "#EAF0FF",
  "#E6F7EF",
  "#FFF7CC",
  "#FDE8EF",
  "#EFE7FF",
  "#1B2236",
];

/** Theme variables for previews drawn outside a slide. */
const themeVars = (theme: Theme) => {
  const t = THEMES[theme];
  return {
    "--sl-accent": t.accent,
    "--sl-fg": t.fg,
    "--sl-bg": t.bg,
    color: t.fg,
  } as CSSProperties;
};

const tile =
  "press flex items-center justify-center rounded-[10px] border border-border bg-background transition-colors hover:border-app/60 hover:bg-app-soft";

export function LibraryPanel({
  doc,
  slideId,
  background,
  theme,
  tab,
  onTab,
  chart,
  onAdded,
  onClose,
  allSlideIds,
}: {
  doc: Y.Doc;
  slideId: string;
  background: string | undefined;
  theme: Theme;
  tab: LibraryTab;
  onTab: (t: LibraryTab) => void;
  /** The selected chart element, if any (its data is edited here). */
  chart: SlideElement | null;
  onAdded: (id: string, edit?: boolean) => void;
  onClose: () => void;
  allSlideIds: string[];
}) {
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const icons = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? ICON_NAMES.filter((n) => n.includes(q)) : ICON_NAMES;
  }, [query]);
  const vars = themeVars(theme);

  return (
    <aside
      aria-label="Elements"
      className="flex w-[332px] shrink-0 border-r border-border bg-card"
    >
      <nav
        className="flex w-[68px] shrink-0 flex-col items-center gap-1 border-r border-border py-3"
        aria-label="Element types"
      >
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            aria-pressed={tab === id}
            className={cn(
              "press flex w-14 flex-col items-center gap-1 rounded-[10px] py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              tab === id &&
                "bg-app-soft text-app hover:bg-app-soft hover:text-app",
            )}
          >
            <Icon className="size-[18px]" />
            {label}
          </button>
        ))}
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center justify-between px-4">
          <h2 className="font-display text-[15px] font-semibold tracking-tight">
            {TABS.find((t) => t.id === tab)?.label}
          </h2>
          <Tooltip delayDuration={400}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close panel"
                onClick={onClose}
                className="text-muted-foreground"
              >
                <X />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Close panel</TooltipContent>
          </Tooltip>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          {tab === "text" && (
            <div className="space-y-2">
              {TEXT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onAdded(addTextBox(doc, slideId, p))}
                  className={cn(
                    tile,
                    "w-full justify-start overflow-hidden px-3 py-3 text-left",
                  )}
                  style={{
                    fontFamily:
                      p.font === "title"
                        ? FONT_STACK[THEMES[theme].title]
                        : p.font === "body"
                          ? FONT_STACK[THEMES[theme].body]
                          : FONT_STACK[p.font],
                    fontSize: Math.min(30, Math.max(13, p.size / 3)),
                    fontWeight:
                      p.font === "title" ? THEMES[theme].weight : undefined,
                    lineHeight: 1.1,
                  }}
                >
                  <Markup
                    as="span"
                    className="truncate"
                    html={p.html.replace(/<\/?p>/g, "")}
                  />
                </button>
              ))}
            </div>
          )}

          {tab === "shapes" && (
            <div className="grid grid-cols-3 gap-2" style={vars}>
              {(Object.keys(SHAPES) as ShapeKind[]).map((shape) => (
                <Tooltip key={shape} delayDuration={500}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={SHAPES[shape]}
                      onClick={() => onAdded(addShape(doc, slideId, shape))}
                      className={cn(tile, "aspect-square p-4")}
                    >
                      <Markup
                        as="span"
                        className="block size-full"
                        html={shapeSvg({
                          id: "p",
                          type: "shape",
                          shape,
                          x: 0,
                          y: 0,
                          w: shape === "line" ? 6 : 4,
                          h: shape === "line" ? 0.6 : 7.1,
                          color: "accent",
                          strokeWidth: shape === "line" ? 3 : undefined,
                        })}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{SHAPES[shape]}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}

          {tab === "icons" && (
            <>
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search icons"
                  aria-label="Search icons"
                  className="pl-8"
                />
              </div>
              {icons.length ? (
                <div className="grid grid-cols-5 gap-1.5" style={vars}>
                  {icons.map((name) => (
                    <button
                      key={name}
                      type="button"
                      title={name.replace(/-/g, " ")}
                      aria-label={name.replace(/-/g, " ")}
                      onClick={() => onAdded(addIcon(doc, slideId, name))}
                      className={cn(tile, "aspect-square p-2.5")}
                    >
                      <Markup
                        as="span"
                        className="block size-full"
                        html={iconSvg(name, "fg", 1.75)}
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No icons match "{query}"
                </p>
              )}
            </>
          )}

          {tab === "images" && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={cn(
                  tile,
                  "h-32 w-full flex-col gap-2 border-dashed text-sm text-muted-foreground",
                )}
              >
                <Plus className="size-5" />
                Upload an image
              </button>
              <p className="text-xs text-muted-foreground">
                Images are placed freely: drag to move, pull a corner to resize,
                and use Crop to fill from the toolbar.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  for (const f of files) {
                    try {
                      onAdded(await addImage(doc, slideId, f));
                    } catch (err) {
                      showToast.error(
                        err instanceof Error
                          ? err.message
                          : "Could not read image",
                      );
                    }
                  }
                }}
              />
            </div>
          )}

          {tab === "backgrounds" && (
            <div className="space-y-4" style={vars}>
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!background}
                  onClick={() => setBackground(doc, slideId, undefined)}
                >
                  Use theme background
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    doc.transact(() =>
                      allSlideIds.forEach((id) => {
                        setBackground(doc, id, background);
                      }),
                    );
                    showToast.success("Background applied to all slides");
                  }}
                >
                  Apply to all
                </Button>
              </div>
              <Section title="Solid">
                {[
                  ...new Set(
                    [
                      THEMES[theme].bg,
                      THEMES[theme].accent,
                      THEMES[theme].fg,
                      ...PALETTE,
                      ...SOFT,
                    ].map((c) => c.toUpperCase()),
                  ),
                ].map((c) => (
                  <Swatch
                    key={c}
                    label={c}
                    css={c}
                    active={background?.toUpperCase() === c}
                    onClick={() => setBackground(doc, slideId, c)}
                  />
                ))}
              </Section>
              <Section title="Gradients and patterns">
                {Object.entries(BACKGROUNDS).map(([key, b]) => (
                  <Swatch
                    key={key}
                    label={b.label}
                    css={backgroundCss(key) ?? ""}
                    active={background === key}
                    onClick={() => setBackground(doc, slideId, key)}
                    wide
                  />
                ))}
              </Section>
            </div>
          )}

          {tab === "charts" &&
            (chart?.chart ? (
              <ChartEditor
                el={chart}
                onChange={(c) => patchElement(doc, chart.id, { chart: c })}
              />
            ) : (
              <div className="space-y-2" style={vars}>
                {(Object.keys(CHART_PRESETS) as ChartKind[]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => onAdded(addChart(doc, slideId, kind))}
                    className={cn(tile, "h-28 w-full flex-col gap-1 p-3")}
                  >
                    <Markup
                      as="span"
                      className="block h-16 w-full"
                      html={chartSvg(
                        { kind, ...CHART_PRESETS[kind] },
                        400,
                        170,
                      )}
                    />
                    <span className="text-xs font-medium capitalize text-muted-foreground">
                      {kind} chart
                    </span>
                  </button>
                ))}
                <p className="pt-1 text-xs text-muted-foreground">
                  Select a chart on the slide to edit its numbers here.
                </p>
              </div>
            ))}
        </div>
      </div>
    </aside>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium text-muted-foreground">
        {title}
      </h3>
      <div className="grid grid-cols-6 gap-2">{children}</div>
    </section>
  );
}

function Swatch({
  label,
  css,
  active,
  onClick,
  wide,
}: {
  label: string;
  css: string;
  active: boolean;
  onClick: () => void;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "press rounded-[8px] border border-border",
        wide ? "col-span-2 aspect-video" : "aspect-square",
        active && "ring-2 ring-app ring-offset-2 ring-offset-card",
      )}
      style={{ background: css }}
    />
  );
}

function ChartEditor({
  el,
  onChange,
}: {
  el: SlideElement;
  onChange: (c: NonNullable<SlideElement["chart"]>) => void;
}) {
  const chart = el.chart as NonNullable<SlideElement["chart"]>;
  const set = (labels: string[], values: number[]) =>
    onChange({ ...chart, labels, values });
  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-full bg-muted p-1">
        {(["bar", "line", "pie"] as ChartKind[]).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => onChange({ ...chart, kind })}
            className={cn(
              "press flex-1 rounded-full py-1 text-xs font-medium capitalize",
              chart.kind === kind
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground",
            )}
          >
            {kind}
          </button>
        ))}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="pb-1 font-medium">Label</th>
            <th className="pb-1 font-medium">Value</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {chart.labels.map((label, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
            <tr key={i}>
              <td className="py-0.5 pr-1.5">
                <Input
                  value={label}
                  aria-label={`Label ${i + 1}`}
                  className="h-8"
                  onChange={(e) =>
                    set(
                      chart.labels.map((l, j) =>
                        j === i ? e.target.value.slice(0, 40) : l,
                      ),
                      chart.values,
                    )
                  }
                />
              </td>
              <td className="py-0.5 pr-1.5">
                <Input
                  type="number"
                  value={Number.isFinite(chart.values[i]) ? chart.values[i] : 0}
                  aria-label={`Value ${i + 1}`}
                  className="h-8 tabular-nums"
                  onChange={(e) =>
                    set(
                      chart.labels,
                      chart.values.map((v, j) =>
                        j === i ? Number(e.target.value) || 0 : v,
                      ),
                    )
                  }
                />
              </td>
              <td>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove row ${i + 1}`}
                  disabled={chart.labels.length <= 1}
                  onClick={() =>
                    set(
                      chart.labels.filter((_, j) => j !== i),
                      chart.values.filter((_, j) => j !== i),
                    )
                  }
                  className="text-muted-foreground"
                >
                  <Trash2 />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={chart.labels.length >= 24}
        onClick={() =>
          set(
            [...chart.labels, `Item ${chart.labels.length + 1}`],
            [...chart.values, 10],
          )
        }
      >
        <Plus />
        Add row
      </Button>
    </div>
  );
}
