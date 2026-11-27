"use client";

import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Circle,
  Eraser,
  Highlighter,
  ImagePlus,
  Minus,
  MousePointer2,
  PanelLeft,
  Pencil,
  PenLine,
  Plus,
  RotateCw,
  Search,
  Slash,
  Square,
  Stamp,
  StickyNote,
  Strikethrough,
  Type,
  Underline,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  PillButton,
  ToolbarSeparator,
} from "@/components/editor/toolbar-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { InsertKind, StampKind, ZoomMode } from "./pdf-state";
import { PALETTE, type Tool, type ToolStyle } from "./tools";

const SHAPES: {
  tool: Tool;
  label: string;
  key: string;
  Icon: typeof Square;
}[] = [
  { tool: "rect", label: "Rectangle", key: "R", Icon: Square },
  { tool: "ellipse", label: "Ellipse", key: "O", Icon: Circle },
  { tool: "line", label: "Line", key: "L", Icon: Slash },
  { tool: "arrow", label: "Arrow", key: "A", Icon: ArrowUpRight },
];

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

export interface ToolbarProps {
  canEdit: boolean;
  tool: Tool;
  setTool: (t: Tool) => void;
  style: ToolStyle;
  /** Which style controls apply: the active tool's, or the selected annotation's. */
  styleFor: Tool | null;
  setStyle: (patch: Partial<ToolStyle>) => void;
  insert: (k: InsertKind) => void;
  stamp: (k: StampKind) => void;
  zoom: number;
  setZoom: (z: ZoomMode | "in" | "out") => void;
  pageIndex: number;
  pageCount: number;
  goToPage: (index: number) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  find: () => void;
  rotateView: () => void;
}

export function PdfToolbar(p: ToolbarProps) {
  const shape = SHAPES.find((s) => s.tool === p.tool) ?? SHAPES[0];
  const tool = (t: Tool, label: string, key: string, Icon: typeof Square) => (
    <PillButton
      label={`${label} (${key})`}
      active={p.tool === t}
      onClick={() => p.setTool(p.tool === t && t !== "select" ? "select" : t)}
    >
      <Icon />
    </PillButton>
  );

  return (
    <div
      role="toolbar"
      aria-label="PDF tools"
      className="flex h-12 max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-border bg-popover px-2 text-popover-foreground shadow-float [scrollbar-width:none]"
    >
      <PillButton
        label={p.sidebarOpen ? "Hide pages" : "Show pages"}
        active={p.sidebarOpen}
        onClick={p.toggleSidebar}
      >
        <PanelLeft />
      </PillButton>
      <ToolbarSeparator />
      {p.canEdit && (
        <>
          {tool("select", "Select", "V", MousePointer2)}
          {tool("highlight", "Highlight text", "H", Highlighter)}
          {tool("underline", "Underline text", "U", Underline)}
          {tool("strike", "Strike through text", "S", Strikethrough)}
          {tool("ink", "Pen", "P", Pencil)}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                aria-label="Shapes"
                className={cn(
                  "h-8 gap-0.5 rounded-full px-2 text-muted-foreground",
                  SHAPES.some((s) => s.tool === p.tool) &&
                    "bg-app-soft text-app hover:bg-app-soft hover:text-app",
                )}
              >
                <shape.Icon />
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {SHAPES.map((s) => (
                <DropdownMenuItem
                  key={s.tool}
                  onSelect={() => p.setTool(s.tool)}
                >
                  <s.Icon />
                  {s.label}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {s.key}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {tool("text", "Text box", "T", Type)}
          {tool("note", "Sticky note", "N", StickyNote)}
          {tool("eraser", "Eraser", "E", Eraser)}
          {p.styleFor && (
            <StyleControl
              style={p.style}
              styleFor={p.styleFor}
              setStyle={p.setStyle}
            />
          )}
          <ToolbarSeparator />
          <PillButton label="Sign" onClick={() => p.insert("signature")}>
            <PenLine />
          </PillButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                aria-label="Insert"
                className="h-8 gap-0.5 rounded-full px-2 text-muted-foreground"
              >
                <Plus />
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onSelect={() => p.insert("image")}>
                <ImagePlus />
                Image
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => p.insert("signature")}>
                <PenLine />
                Signature
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => p.insert("initials")}>
                <PenLine />
                Initials
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => p.insert("date")}>
                <Type />
                Date
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {(
                [
                  "Approved",
                  "Draft",
                  "Rejected",
                  "Confidential",
                  "Date",
                ] as StampKind[]
              ).map((k) => (
                <DropdownMenuItem key={k} onSelect={() => p.stamp(k)}>
                  <Stamp />
                  {k === "Date" ? "Date stamp" : `${k} stamp`}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <ToolbarSeparator />
        </>
      )}
      <PillButton label="Zoom out" onClick={() => p.setZoom("out")}>
        <Minus />
      </PillButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 min-w-14 rounded-full px-2 text-[13px] tabular-nums"
          >
            {Math.round(p.zoom * 100)}%
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-40">
          <DropdownMenuItem onSelect={() => p.setZoom("width")}>
            Fit width
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => p.setZoom("page")}>
            Fit page
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {ZOOMS.map((z) => (
            <DropdownMenuItem key={z} onSelect={() => p.setZoom(z)}>
              {z * 100}%
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <PillButton label="Zoom in" onClick={() => p.setZoom("in")}>
        <Plus />
      </PillButton>
      <PillButton label="Rotate view" onClick={p.rotateView}>
        <RotateCw />
      </PillButton>
      <ToolbarSeparator />
      <PageJump index={p.pageIndex} count={p.pageCount} go={p.goToPage} />
      <PillButton label="Find (Ctrl+F)" onClick={p.find}>
        <Search />
      </PillButton>
    </div>
  );
}

function StyleControl({
  style,
  styleFor,
  setStyle,
}: {
  style: ToolStyle;
  styleFor: Tool;
  setStyle: (patch: Partial<ToolStyle>) => void;
}) {
  const stroke = ["ink", "rect", "ellipse", "line", "arrow"].includes(styleFor);
  const fillable = styleFor === "rect" || styleFor === "ellipse";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Colour and size"
          className="press ml-0.5 flex size-8 items-center justify-center rounded-full outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <span
            className="size-4 rounded-full shadow-[0_0_0_1px_rgb(0_0_0/0.2)]"
            style={{ background: style.color }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-56 rounded-[14px] p-3">
        <fieldset className="grid grid-cols-9 gap-1" aria-label="Colour">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={style.color === c}
              aria-label={c}
              onClick={() => setStyle({ color: c })}
              className={cn(
                "size-5 rounded-full shadow-[0_0_0_1px_rgb(0_0_0/0.15)] outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                style.color === c &&
                  "ring-2 ring-[var(--app)] ring-offset-1 ring-offset-popover",
              )}
              style={{ background: c }}
            />
          ))}
        </fieldset>
        {stroke && (
          <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            Width
            <input
              type="range"
              min={0.5}
              max={12}
              step={0.5}
              value={style.width}
              onChange={(e) => setStyle({ width: Number(e.target.value) })}
              className="flex-1 accent-[var(--app)]"
            />
            <span className="w-6 text-right tabular-nums">{style.width}</span>
          </label>
        )}
        {styleFor === "text" && (
          <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            Size
            <input
              type="range"
              min={6}
              max={72}
              step={1}
              value={style.size}
              onChange={(e) => setStyle({ size: Number(e.target.value) })}
              className="flex-1 accent-[var(--app)]"
            />
            <span className="w-6 text-right tabular-nums">{style.size}</span>
          </label>
        )}
        {fillable && (
          <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={style.fill}
              onChange={(e) => setStyle({ fill: e.target.checked })}
              className="accent-[var(--app)]"
            />
            Filled
          </label>
        )}
      </PopoverContent>
    </Popover>
  );
}

function PageJump({
  index,
  count,
  go,
}: {
  index: number;
  count: number;
  go: (i: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <form
      className="flex items-center gap-1 px-1 text-[13px] text-muted-foreground"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number.parseInt(draft ?? "", 10);
        if (n >= 1 && n <= count) go(n - 1);
        setDraft(null);
      }}
    >
      <input
        value={draft ?? String(index + 1)}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
        onFocus={(e) => e.target.select()}
        onBlur={() => setDraft(null)}
        aria-label="Page number"
        inputMode="numeric"
        className="h-7 w-9 rounded-[8px] border border-border bg-transparent text-center text-foreground tabular-nums outline-none focus:border-[var(--app)]"
      />
      <span className="tabular-nums whitespace-nowrap">of {count}</span>
    </form>
  );
}

export function FindBar({
  open,
  count,
  current,
  busy,
  onQuery,
  onStep,
  onClose,
}: {
  open: boolean;
  count: number;
  current: number;
  busy: boolean;
  onQuery: (q: string) => void;
  onStep: (dir: 1 | -1) => void;
  onClose: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (open) {
      input.current?.focus();
      input.current?.select();
    }
  }, [open]);
  useEffect(() => {
    const t = setTimeout(() => onQuery(q), 180);
    return () => clearTimeout(t);
  }, [q, onQuery]);
  if (!open) return null;
  return (
    <search className="absolute top-3 right-4 z-20 flex h-11 items-center gap-1 rounded-full border border-border bg-popover pr-1.5 pl-4 text-popover-foreground shadow-float">
      <Search className="size-4 text-muted-foreground" />
      <input
        ref={input}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onStep(e.shiftKey ? -1 : 1);
          } else if (e.key === "Escape") onClose();
        }}
        placeholder="Find in PDF"
        aria-label="Find in PDF"
        className="h-8 w-44 bg-transparent px-1 text-[13px] outline-none"
      />
      <span
        className="min-w-14 text-right text-xs tabular-nums text-muted-foreground"
        aria-live="polite"
      >
        {q.trim()
          ? busy
            ? "Searching"
            : count
              ? `${current + 1} of ${count}`
              : "No results"
          : ""}
      </span>
      <PillButton
        label="Previous (Shift+Enter)"
        disabled={!count}
        onClick={() => onStep(-1)}
      >
        <ChevronUp />
      </PillButton>
      <PillButton
        label="Next (Enter)"
        disabled={!count}
        onClick={() => onStep(1)}
      >
        <ChevronDown />
      </PillButton>
      <PillButton label="Close (Esc)" onClick={onClose}>
        <X />
      </PillButton>
    </search>
  );
}
