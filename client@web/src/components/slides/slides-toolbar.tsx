"use client";

import { type Editor, useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ImagePlus,
  Italic,
  LayoutTemplate,
  List,
  ListOrdered,
  Plus,
  Shapes,
  Type,
  Underline,
} from "lucide-react";
import { useRef } from "react";
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
  LAYOUTS,
  type Layout,
  type Slide,
  THEMES,
  type Theme,
  TRANSITIONS,
  type Transition,
} from "@/lib/slides/model";
import { GEOMETRY, SLIDE_H, SLIDE_W } from "@/lib/slides/styles";
import { cn } from "@/lib/utils";
import { PALETTE } from "./element-toolbar";
import { StaticSlide } from "./slide-view";

/** A tiny drawing of a layout's regions, straight from the shared geometry. */
export function LayoutGlyph({
  layout,
  className,
}: {
  layout: Layout;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 18"
      className={cn(
        "h-[18px] w-8 shrink-0 rounded-[3px] border border-border bg-background",
        className,
      )}
      aria-hidden="true"
    >
      {Object.entries(GEOMETRY[layout]).map(([region, b]) => (
        <rect
          key={region}
          x={(b.x / SLIDE_W) * 32}
          y={(b.y / SLIDE_H) * 18}
          width={(b.w / SLIDE_W) * 32}
          height={Math.max(
            0.8,
            (b.h / SLIDE_H) * 18 * (b.font === "title" ? 0.5 : 0.85),
          )}
          rx={0.5}
          className={
            b.font === "title" || b.color
              ? "fill-app/70"
              : "fill-muted-foreground/35"
          }
        />
      ))}
    </svg>
  );
}

const sample = (theme: Theme): Slide => ({
  id: `sample-${theme}`,
  layout: "title",
  notes: "",
  html: { title: "<p>Aa</p>", subtitle: `<p>${THEMES[theme].label}</p>` },
  elements: [],
});
const SAMPLES = Object.fromEntries(
  (Object.keys(THEMES) as Theme[]).map((t) => [t, sample(t)]),
) as Record<Theme, Slide>;

const TEXT_COLORS = [
  { label: "Default", value: null },
  { label: "Accent", value: "var(--sl-accent)" },
  ...PALETTE.map((c) => ({ label: c, value: c })),
];

export interface ToolbarProps {
  editor: Editor | null;
  canEdit: boolean;
  layout: Layout;
  theme: Theme;
  transition: Transition;
  libraryOpen: boolean;
  onAddSlide: (layout: Layout) => void;
  onLayout: (layout: Layout) => void;
  onTheme: (theme: Theme) => void;
  onTransition: (t: Transition) => void;
  onAddText: () => void;
  onInsertImages: (files: File[]) => void;
  onToggleLibrary: () => void;
  onTemplates: () => void;
}

const menuTrigger = "h-8 gap-1 rounded-full px-3 text-[13px] font-medium";

export function SlidesToolbar(p: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const live = p.editor && !p.editor.isDestroyed ? p.editor : null;
  const state = useEditorState({
    editor: live,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            underline: editor.isActive("underline"),
            bullet: editor.isActive("bulletList"),
            ordered: editor.isActive("orderedList"),
            align:
              (["center", "right"] as const).find((a) =>
                editor.isActive({ textAlign: a }),
              ) ?? "left",
          }
        : null,
  });
  const fmt = !!live && p.canEdit;
  const run = (fn: (e: Editor) => void) => () => live && fn(live);

  if (!p.canEdit) return null;

  return (
    <div
      role="toolbar"
      aria-label="Slide tools"
      className="flex h-12 max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-border bg-popover px-2 text-popover-foreground shadow-float [scrollbar-width:none]"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="app"
            size="sm"
            className="h-8 gap-1 rounded-full pr-2 pl-2.5"
          >
            <Plus />
            Slide
            <ChevronDown className="size-3.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="grid w-[420px] grid-cols-2 gap-1 rounded-[14px] p-2"
        >
          {(Object.keys(LAYOUTS) as Layout[]).map((l) => (
            <DropdownMenuItem
              key={l}
              onSelect={() => p.onAddSlide(l)}
              className="gap-2.5 rounded-[10px] py-2"
            >
              <LayoutGlyph layout={l} className="h-[27px] w-12" />
              {LAYOUTS[l].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={menuTrigger}>
            <LayoutGlyph layout={p.layout} className="h-3.5 w-6" />
            Layout
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="grid w-[420px] grid-cols-2 gap-1 rounded-[14px] p-2"
        >
          {(Object.keys(LAYOUTS) as Layout[]).map((l) => (
            <DropdownMenuItem
              key={l}
              onSelect={() => p.onLayout(l)}
              className={cn(
                "gap-2.5 rounded-[10px] py-2",
                l === p.layout && "bg-app-soft text-app",
              )}
            >
              <LayoutGlyph layout={l} className="h-[27px] w-12" />
              {LAYOUTS[l].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className={menuTrigger}>
            <span
              className="size-3.5 rounded-full border border-border"
              style={{
                background: THEMES[p.theme].bg,
                boxShadow: `inset -5px 0 0 ${THEMES[p.theme].accent}`,
              }}
            />
            Theme
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[340px] rounded-[14px] p-3">
          <p className="mb-2 font-display text-[15px] font-semibold tracking-tight">
            Theme
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {(Object.keys(THEMES) as Theme[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => p.onTheme(t)}
                aria-pressed={t === p.theme}
                aria-label={`${THEMES[t].label} theme`}
                className={cn(
                  "press group overflow-hidden rounded-[10px] text-left ring-offset-2 ring-offset-popover transition-shadow",
                  t === p.theme
                    ? "ring-2 ring-app"
                    : "shadow-card hover:shadow-card-hover",
                )}
              >
                <StaticSlide
                  slide={SAMPLES[t]}
                  theme={t}
                  scale={150 / SLIDE_W}
                  className="pointer-events-none"
                />
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={menuTrigger}>
            {p.transition === "none" ? "Transition" : TRANSITIONS[p.transition]}
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          {(Object.keys(TRANSITIONS) as Transition[]).map((t) => (
            <DropdownMenuItem
              key={t}
              onSelect={() => p.onTransition(t)}
              className={cn(t === p.transition && "bg-app-soft text-app")}
            >
              {TRANSITIONS[t]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarSeparator />
      <PillButton
        label="Bold"
        active={state?.bold}
        disabled={!fmt}
        onClick={run((e) => e.chain().focus().toggleBold().run())}
      >
        <Bold />
      </PillButton>
      <PillButton
        label="Italic"
        active={state?.italic}
        disabled={!fmt}
        onClick={run((e) => e.chain().focus().toggleItalic().run())}
      >
        <Italic />
      </PillButton>
      <PillButton
        label="Underline"
        active={state?.underline}
        disabled={!fmt}
        onClick={run((e) => e.chain().focus().toggleUnderline().run())}
      >
        <Underline />
      </PillButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={!fmt}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Text colour"
            className="rounded-full text-muted-foreground"
          >
            <span className="text-[15px] font-semibold leading-none underline decoration-app decoration-2 underline-offset-2">
              A
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          {TEXT_COLORS.map((c) => (
            <DropdownMenuItem
              key={c.label}
              className="gap-2"
              onSelect={run((e) =>
                c.value
                  ? e.chain().focus().setColor(c.value).run()
                  : e.chain().focus().unsetColor().run(),
              )}
            >
              <span
                className="size-4 rounded-full border border-border"
                style={{
                  background:
                    c.value === "var(--sl-accent)"
                      ? THEMES[p.theme].accent
                      : (c.value ?? THEMES[p.theme].fg),
                }}
              />
              {c.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <PillButton
        label="Bulleted list"
        active={state?.bullet}
        disabled={!fmt}
        onClick={run((e) => e.chain().focus().toggleBulletList().run())}
      >
        <List />
      </PillButton>
      <PillButton
        label="Numbered list"
        active={state?.ordered}
        disabled={!fmt}
        onClick={run((e) => e.chain().focus().toggleOrderedList().run())}
      >
        <ListOrdered />
      </PillButton>
      {(
        [
          ["left", "Align left", AlignLeft],
          ["center", "Align center", AlignCenter],
          ["right", "Align right", AlignRight],
        ] as const
      ).map(([a, label, Icon]) => (
        <PillButton
          key={a}
          label={label}
          active={fmt && state?.align === a}
          disabled={!fmt}
          onClick={run((e) => e.chain().focus().setTextAlign(a).run())}
        >
          <Icon />
        </PillButton>
      ))}

      <ToolbarSeparator />
      <PillButton label="Text box" onClick={p.onAddText}>
        <Type />
      </PillButton>
      <PillButton label="Image" onClick={() => fileRef.current?.click()}>
        <ImagePlus />
      </PillButton>
      <PillButton
        label="Elements"
        active={p.libraryOpen}
        onClick={p.onToggleLibrary}
      >
        <Shapes />
      </PillButton>
      <Button variant="ghost" className={menuTrigger} onClick={p.onTemplates}>
        <LayoutTemplate />
        Templates
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) p.onInsertImages(files);
        }}
      />
    </div>
  );
}
