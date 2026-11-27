"use client";

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  BringToFront,
  ChevronDown,
  Copy,
  Crop,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  SendToBack,
  SlidersHorizontal,
  Table2,
  Trash2,
  Unlock,
} from "lucide-react";
import { useRef } from "react";
import type * as Y from "yjs";
import {
  PillButton,
  ToolbarSeparator,
} from "@/components/editor/toolbar-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  duplicateElement,
  lowerElement,
  patchElement,
  raiseElement,
  removeElement,
} from "@/lib/slides/deck-doc";
import {
  type AlignMode,
  alignBoxes,
  distributeBoxes,
} from "@/lib/slides/geometry";
import type {
  ChartKind,
  Paint,
  SlideElement,
  TextFont,
  Theme,
} from "@/lib/slides/model";
import { THEMES } from "@/lib/slides/model";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { readImage } from "./element-actions";

export const PALETTE = [
  "#FFFFFF",
  "#121418",
  "#FF6A1F",
  "#FFE45C",
  "#3B5BFD",
  "#0E9F6E",
  "#E0457B",
  "#7C3AED",
  "#D7261E",
  "#94A3B8",
];

const FONTS: { value: TextFont; label: string; css: string }[] = [
  { value: "title", label: "Theme heading", css: "var(--font-display-face)" },
  { value: "body", label: "Theme body", css: "var(--font-ui)" },
  { value: "display", label: "Display", css: "var(--font-display-face)" },
  { value: "sans", label: "Sans", css: "var(--font-ui)" },
  { value: "serif", label: "Serif", css: "Georgia, serif" },
  { value: "mono", label: "Mono", css: "ui-monospace, monospace" },
];

const resolvePaint = (p: Paint | undefined, theme: Theme) => {
  const t = THEMES[theme];
  if (!p || p === "none") return "transparent";
  return p === "accent" ? t.accent : p === "fg" ? t.fg : p === "bg" ? t.bg : p;
};

/** Theme colours, a palette and a native picker. */
export function PaintPicker({
  label,
  value,
  theme,
  allowNone,
  onChange,
  ring,
}: {
  label: string;
  value: Paint | undefined;
  theme: Theme;
  allowNone?: boolean;
  onChange: (p: Paint) => void;
  /** Show the swatch as a ring (stroke) instead of a dot (fill). */
  ring?: boolean;
}) {
  const t = THEMES[theme];
  const swatch = (p: Paint, title: string) => (
    <button
      key={p}
      type="button"
      title={title}
      aria-label={title}
      onClick={() => onChange(p)}
      className={cn(
        "press size-7 rounded-full border border-border",
        value === p && "ring-2 ring-app ring-offset-2 ring-offset-popover",
        p === "none" &&
          "bg-[linear-gradient(135deg,transparent_45%,var(--destructive)_45%,var(--destructive)_55%,transparent_55%)]",
      )}
      style={p === "none" ? undefined : { background: resolvePaint(p, theme) }}
    />
  );
  return (
    <Popover>
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={label}
              className="rounded-full"
            >
              <span
                className={cn(
                  "size-5 rounded-full border border-border",
                  ring && "border-[3px]",
                )}
                style={
                  ring
                    ? { borderColor: resolvePaint(value, theme) }
                    : { background: resolvePaint(value, theme) }
                }
              />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
      <PopoverContent
        className="w-64 rounded-[14px] p-3"
        side="bottom"
        align="center"
      >
        <p className="mb-2 text-xs font-medium text-muted-foreground">Theme</p>
        <div className="mb-3 flex gap-2">
          {swatch("accent", `Accent ${t.accent}`)}
          {swatch("fg", `Text ${t.fg}`)}
          {swatch("bg", `Background ${t.bg}`)}
          {allowNone && swatch("none", "None")}
        </div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Colours
        </p>
        <div className="grid grid-cols-6 gap-2">
          {PALETTE.map((c) => swatch(c, c))}
          <label
            className="press relative flex size-7 cursor-pointer items-center justify-center rounded-full border border-dashed border-border text-muted-foreground"
            title="Custom colour"
          >
            <Plus className="size-3.5" />
            <input
              type="color"
              aria-label="Custom colour"
              className="absolute inset-0 cursor-pointer opacity-0"
              value={/^#[0-9a-f]{6}$/i.test(value ?? "") ? value : "#ff6a1f"}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
            />
          </label>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-xs text-muted-foreground">
        {label}
        <span className="tabular-nums text-foreground">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--app)]"
      />
    </label>
  );
}

export function ElementToolbar({
  doc,
  elements,
  theme,
  onSelect,
  onEditChart,
}: {
  doc: Y.Doc;
  elements: SlideElement[];
  theme: Theme;
  onSelect: (ids: string[]) => void;
  onEditChart: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const single = elements.length === 1 ? elements[0] : null;
  const patch = (p: Partial<SlideElement>) =>
    doc.transact(() => {
      for (const e of elements) patchElement(doc, e.id, p);
    });
  const allLocked = elements.every((e) => e.locked);

  const align = (mode: AlignMode) => {
    const next = alignBoxes(elements, mode);
    doc.transact(() =>
      elements.forEach((e, i) => {
        patchElement(doc, e.id, { x: next[i].x, y: next[i].y });
      }),
    );
  };
  const distribute = (axis: "x" | "y") => {
    const next = distributeBoxes(elements, axis);
    doc.transact(() =>
      elements.forEach((e, i) => {
        patchElement(doc, e.id, { x: next[i].x, y: next[i].y });
      }),
    );
  };

  const opacity = Math.round((single?.opacity ?? 1) * 100);

  return (
    <div className="flex h-11 items-center gap-0.5 rounded-full border border-border bg-popover px-1.5 text-popover-foreground shadow-float">
      {single?.type === "text" && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 rounded-full px-2.5 text-[13px] font-normal"
              >
                {FONTS.find((f) => f.value === (single.font ?? "body"))?.label}
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {FONTS.map((f) => (
                <DropdownMenuItem
                  key={f.value}
                  onSelect={() => patch({ font: f.value })}
                  style={{ fontFamily: f.css }}
                  className="text-[15px]"
                >
                  {f.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <PillButton
            label="Smaller text"
            onClick={() =>
              patch({
                size: Math.max(8, Math.round((single.size ?? 28) / 1.15)),
              })
            }
          >
            <Minus />
          </PillButton>
          <span className="w-8 text-center text-[13px] tabular-nums">
            {Math.round(single.size ?? 28)}
          </span>
          <PillButton
            label="Larger text"
            onClick={() =>
              patch({
                size: Math.min(400, Math.round((single.size ?? 28) * 1.15)),
              })
            }
          >
            <Plus />
          </PillButton>
          <PaintPicker
            label="Text colour"
            value={single.color ?? "fg"}
            theme={theme}
            onChange={(color) => patch({ color })}
          />
          <ToolbarSeparator />
        </>
      )}
      {single?.type === "shape" && (
        <>
          <PaintPicker
            label="Fill"
            value={single.color}
            theme={theme}
            allowNone
            onChange={(color) => patch({ color })}
          />
          {single.shape !== "line" && (
            <PaintPicker
              label="Border"
              value={single.stroke ?? "none"}
              theme={theme}
              allowNone
              ring
              onChange={(stroke) => patch({ stroke })}
            />
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Shape settings"
                className="rounded-full text-muted-foreground"
              >
                <SlidersHorizontal />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 space-y-3 rounded-[14px] p-3">
              <Slider
                label={single.shape === "line" ? "Thickness" : "Border width"}
                value={
                  single.strokeWidth ??
                  (single.shape === "line"
                    ? 6
                    : single.stroke && single.stroke !== "none"
                      ? 4
                      : 0)
                }
                min={0}
                max={40}
                onChange={(strokeWidth) => patch({ strokeWidth })}
              />
              {(single.shape === "rect" ||
                single.shape === "rounded" ||
                single.shape === "bubble") && (
                <Slider
                  label="Corner radius"
                  value={Math.round(single.radius ?? 0)}
                  min={0}
                  max={200}
                  onChange={(radius) => patch({ radius })}
                />
              )}
            </PopoverContent>
          </Popover>
          <ToolbarSeparator />
        </>
      )}
      {(single?.type === "icon" || single?.type === "chart") && (
        <>
          <PaintPicker
            label="Colour"
            value={single.color ?? "accent"}
            theme={theme}
            onChange={(color) => patch({ color })}
          />
          {single.type === "icon" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Line weight"
                  className="rounded-full text-muted-foreground"
                >
                  <SlidersHorizontal />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 rounded-[14px] p-3">
                <Slider
                  label="Line weight"
                  value={single.strokeWidth ?? 2}
                  min={0.5}
                  max={4}
                  step={0.25}
                  onChange={(strokeWidth) => patch({ strokeWidth })}
                />
              </PopoverContent>
            </Popover>
          )}
          {single.type === "chart" && single.chart && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 rounded-full px-2.5 text-[13px] font-normal capitalize"
                  >
                    {single.chart.kind} chart
                    <ChevronDown className="size-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {(["bar", "line", "pie"] as ChartKind[]).map((kind) => (
                    <DropdownMenuItem
                      key={kind}
                      className="capitalize"
                      onSelect={() =>
                        single.chart &&
                        patch({ chart: { ...single.chart, kind } })
                      }
                    >
                      {kind} chart
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <PillButton label="Edit data" onClick={onEditChart}>
                <Table2 />
              </PillButton>
            </>
          )}
          <ToolbarSeparator />
        </>
      )}
      {single?.type === "image" && (
        <>
          <PillButton
            label="Replace image"
            onClick={() => fileRef.current?.click()}
          >
            <RefreshCw />
          </PillButton>
          <PillButton
            label={single.fit === "cover" ? "Fit whole image" : "Crop to fill"}
            active={single.fit === "cover"}
            onClick={() =>
              patch({ fit: single.fit === "cover" ? undefined : "cover" })
            }
          >
            <Crop />
          </PillButton>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const { src } = await readImage(file);
                patch({ src });
              } catch (err) {
                showToast.error(
                  err instanceof Error ? err.message : "Could not read image",
                );
              }
            }}
          />
          <ToolbarSeparator />
        </>
      )}
      {elements.length > 1 && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 rounded-full px-2.5 text-[13px] font-normal"
              >
                Align
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto rounded-[14px] p-2">
              <div className="grid grid-cols-4 gap-1">
                {(
                  [
                    ["left", "Align left", AlignStartVertical],
                    ["center", "Align centres", AlignCenterVertical],
                    ["right", "Align right", AlignEndVertical],
                    ["top", "Align top", AlignStartHorizontal],
                    ["middle", "Align middles", AlignCenterHorizontal],
                    ["bottom", "Align bottom", AlignEndHorizontal],
                  ] as const
                ).map(([mode, label, Icon]) => (
                  <PillButton
                    key={mode}
                    label={label}
                    onClick={() => align(mode)}
                  >
                    <Icon />
                  </PillButton>
                ))}
                <PillButton
                  label="Distribute horizontally"
                  disabled={elements.length < 3}
                  onClick={() => distribute("x")}
                >
                  <AlignHorizontalDistributeCenter />
                </PillButton>
                <PillButton
                  label="Distribute vertically"
                  disabled={elements.length < 3}
                  onClick={() => distribute("y")}
                >
                  <AlignVerticalDistributeCenter />
                </PillButton>
              </div>
            </PopoverContent>
          </Popover>
          <ToolbarSeparator />
        </>
      )}
      {single && (
        <Popover>
          <Tooltip delayDuration={500}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Transparency"
                  className="h-8 rounded-full px-2 text-[12px] tabular-nums text-muted-foreground"
                >
                  {opacity}%
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Transparency</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-56 rounded-[14px] p-3">
            <Slider
              label="Opacity"
              value={opacity}
              min={5}
              max={100}
              onChange={(v) =>
                patch({ opacity: v >= 100 ? undefined : v / 100 })
              }
            />
          </PopoverContent>
        </Popover>
      )}
      {single && (
        <>
          <PillButton
            label="Bring to front"
            onClick={() => raiseElement(doc, single.id)}
          >
            <BringToFront />
          </PillButton>
          <PillButton
            label="Send to back"
            onClick={() => lowerElement(doc, single.id)}
          >
            <SendToBack />
          </PillButton>
        </>
      )}
      <PillButton
        label="Duplicate"
        onClick={() => {
          const ids: string[] = [];
          doc.transact(() => {
            for (const e of elements) {
              const id = duplicateElement(doc, e.id);
              if (id) ids.push(id);
            }
          });
          onSelect(ids);
        }}
      >
        <Copy />
      </PillButton>
      <PillButton
        label={allLocked ? "Unlock" : "Lock"}
        active={allLocked}
        onClick={() => patch({ locked: allLocked ? undefined : true })}
      >
        {allLocked ? <Lock /> : <Unlock />}
      </PillButton>
      <PillButton
        label="Delete"
        className="hover:text-destructive"
        onClick={() => {
          doc.transact(() => {
            for (const e of elements) removeElement(doc, e.id);
          });
          onSelect([]);
        }}
      >
        <Trash2 />
      </PillButton>
    </div>
  );
}
