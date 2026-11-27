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
  List,
  ListOrdered,
  Play,
  Plus,
  Underline,
} from "lucide-react";
import { useRef } from "react";
import { insertImages } from "@/components/editor/extensions/image-drop";
import { ToolbarButton, ToolbarSeparator } from "@/components/editor/toolbar-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Layout, LAYOUTS, type Theme, THEMES } from "@/lib/slides/model";
import { cn } from "@/lib/utils";

// Rough region boxes per layout on a 32x18 grid, for the layout menu glyphs.
const GLYPH: Record<Layout, [number, number, number, number][]> = {
  title: [
    [6, 6, 20, 3],
    [6, 11, 14, 1.5],
  ],
  "title-body": [
    [3, 3, 18, 2.5],
    [3, 8, 26, 1.2],
    [3, 10.5, 24, 1.2],
    [3, 13, 20, 1.2],
  ],
  "two-column": [
    [3, 3, 18, 2.5],
    [3, 8, 12, 7],
    [17, 8, 12, 7],
  ],
  section: [
    [3, 7, 4, 0.8],
    [3, 9, 20, 3],
  ],
  image: [
    [3, 3, 18, 2.5],
    [8, 7.5, 16, 8],
  ],
  blank: [],
};

function LayoutGlyph({ layout }: { layout: Layout }) {
  return (
    <svg viewBox="0 0 32 18" className="h-[18px] w-8 shrink-0 rounded-[2px] border border-border bg-paper" aria-hidden="true">
      {GLYPH[layout].map(([x, y, w, h]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx={0.4} className="fill-muted-foreground/50" />
      ))}
    </svg>
  );
}

const COLORS = [
  { label: "Default", value: null },
  { label: "Accent", value: "var(--sl-accent)" },
  { label: "Muted", value: "color-mix(in srgb, currentColor 60%, transparent)" },
  { label: "Red", value: "#C8372D" },
];

export interface ToolbarProps {
  editor: Editor | null;
  canEdit: boolean;
  layout: Layout;
  theme: Theme;
  onAddSlide: (layout: Layout) => void;
  onLayout: (layout: Layout) => void;
  onTheme: (theme: Theme) => void;
  onPrint: () => void;
  onDownloadHtml: () => void;
  onPresent: () => void;
}

const menuTrigger = "h-8 gap-1 px-2 text-[13px] font-normal text-muted-foreground";

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
            align: (["center", "right"] as const).find((a) => editor.isActive({ textAlign: a })) ?? "left",
          }
        : null,
  });
  const fmt = !!live && p.canEdit;
  const run = (fn: (e: Editor) => void) => () => live && fn(live);

  return (
    <div className="flex h-11 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border px-2">
      {p.canEdit && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={menuTrigger}>
                <Plus />
                New slide
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {(Object.keys(LAYOUTS) as Layout[]).map((l) => (
                <DropdownMenuItem key={l} onSelect={() => p.onAddSlide(l)} className="gap-2.5">
                  <LayoutGlyph layout={l} />
                  {LAYOUTS[l].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={menuTrigger}>
                Layout
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {(Object.keys(LAYOUTS) as Layout[]).map((l) => (
                <DropdownMenuItem key={l} onSelect={() => p.onLayout(l)} className={cn("gap-2.5", l === p.layout && "bg-accent")}>
                  <LayoutGlyph layout={l} />
                  {LAYOUTS[l].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={menuTrigger}>
                Theme
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {(Object.keys(THEMES) as Theme[]).map((t) => (
                <DropdownMenuItem key={t} onSelect={() => p.onTheme(t)} className={cn("gap-2.5", t === p.theme && "bg-accent")}>
                  <span
                    className="flex h-[18px] w-8 items-center justify-center rounded-[2px] border border-border font-serif text-[10px] font-semibold"
                    style={{ background: THEMES[t].bg, color: THEMES[t].fg }}
                  >
                    Aa
                  </span>
                  {THEMES[t].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <ToolbarSeparator />
          <ToolbarButton label="Bold" active={state?.bold} disabled={!fmt} onClick={run((e) => e.chain().focus().toggleBold().run())}>
            <Bold />
          </ToolbarButton>
          <ToolbarButton label="Italic" active={state?.italic} disabled={!fmt} onClick={run((e) => e.chain().focus().toggleItalic().run())}>
            <Italic />
          </ToolbarButton>
          <ToolbarButton
            label="Underline"
            active={state?.underline}
            disabled={!fmt}
            onClick={run((e) => e.chain().focus().toggleUnderline().run())}
          >
            <Underline />
          </ToolbarButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={!fmt}>
              <Button variant="ghost" size="icon" aria-label="Text color" className="text-muted-foreground">
                <span className="text-[15px] font-semibold leading-none underline decoration-2 underline-offset-2">A</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              {COLORS.map((c) => (
                <DropdownMenuItem
                  key={c.label}
                  onSelect={run((e) => (c.value ? e.chain().focus().setColor(c.value).run() : e.chain().focus().unsetColor().run()))}
                >
                  {c.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <ToolbarSeparator />
          <ToolbarButton
            label="Bulleted list"
            active={state?.bullet}
            disabled={!fmt}
            onClick={run((e) => e.chain().focus().toggleBulletList().run())}
          >
            <List />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={state?.ordered}
            disabled={!fmt}
            onClick={run((e) => e.chain().focus().toggleOrderedList().run())}
          >
            <ListOrdered />
          </ToolbarButton>
          {(
            [
              ["left", "Align left", AlignLeft],
              ["center", "Align center", AlignCenter],
              ["right", "Align right", AlignRight],
            ] as const
          ).map(([a, label, Icon]) => (
            <ToolbarButton
              key={a}
              label={label}
              active={fmt && state?.align === a}
              disabled={!fmt}
              onClick={run((e) => e.chain().focus().setTextAlign(a).run())}
            >
              <Icon />
            </ToolbarButton>
          ))}
          <ToolbarSeparator />
          <ToolbarButton label="Insert image" disabled={!fmt} onClick={() => fileRef.current?.click()}>
            <ImagePlus />
          </ToolbarButton>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (live && files.length) void insertImages(live, files);
            }}
          />
        </>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className={menuTrigger}>
              Export
              <ChevronDown className="size-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={p.onPrint}>
              PDF
              <span className="ml-auto pl-4 text-xs text-muted-foreground">Print</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={p.onDownloadHtml}>
              Web page
              <span className="ml-auto pl-4 text-xs text-muted-foreground">.html</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" onClick={p.onPresent} className="h-8 px-3" title="Present (F5)">
          <Play />
          Present
        </Button>
      </div>
    </div>
  );
}
