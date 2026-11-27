"use client";
import { AI_ENABLED } from "@/lib/features";
import { useStore } from "@nanostores/react";
import type { Editor, Range } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  CheckSquare,
  ChevronDown,
  Code,
  Copy,
  Eraser,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  MoreHorizontal,
  Plus,
  Printer,
  Redo2,
  Sparkles,
  Strikethrough,
  Subscript,
  Superscript,
  Type,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { computed } from "nanostores";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { editorActions, editorInstance, editorUIState } from "@/state/editor";
import { $wordsToday } from "./core/use-writing-memory";
import {
  BlockIcon,
  promptLink,
  SLASH_ITEMS,
  type SlashItem,
} from "./extensions/slash-command";
import { toggleFocusMode } from "./focus-mode";
import { TableControls } from "./table-controls";
import { PillButton, ToolbarSeparator } from "./toolbar-button";
import { TypographySelector } from "./typography-selector";

const $aiOpen = computed(editorUIState, (s) => s.isAIPanelOpen);

const dispatch = (name: string) => () =>
  window.dispatchEvent(new CustomEvent(name));

const ALIGNMENTS = [
  { value: "left", label: "Align left", Icon: AlignLeft },
  { value: "center", label: "Align center", Icon: AlignCenter },
  { value: "right", label: "Align right", Icon: AlignRight },
  { value: "justify", label: "Justify", Icon: AlignJustify },
] as const;

/** Stored in the document as inline colours, so they are mid-tones that read on light and dark paper. */
const TEXT_COLORS = [
  { label: "Red", value: "#E5484D" },
  { label: "Orange", value: "#F76B15" },
  { label: "Amber", value: "#C98A00" },
  { label: "Green", value: "#0E9F6E" },
  { label: "Teal", value: "#0894B3" },
  { label: "Blue", value: "#3B5BFD" },
  { label: "Purple", value: "#8E4EC6" },
  { label: "Pink", value: "#D6409F" },
  { label: "Grey", value: "#7C838F" },
];

/** The document font when no font is picked is Figtree (see editor-paper.css). */
const FONTS = [
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Playfair Display",
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Source Sans Pro",
  "Roboto Mono",
  "Courier New",
];

const SIZES = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48];

/** Insert menu: the slash-command blocks that are not plain text styles. */
const INSERT_TITLES = [
  "Table",
  "Image",
  "Embed",
  "Diagram",
  "Equation",
  "Math block",
  "Callout",
  "Divider",
  "Page break",
  "Code block",
  "Link to file",
];
const INSERT_ITEMS = INSERT_TITLES.map((t) =>
  SLASH_ITEMS.find((i) => i.title === t),
).filter((i): i is SlashItem => !!i);

function selectFormat(e: Editor | null) {
  if (!e) return null;
  const style = e.getAttributes("textStyle");
  return {
    undo: e.can().undo(),
    redo: e.can().redo(),
    bold: e.isActive("bold"),
    italic: e.isActive("italic"),
    underline: e.isActive("underline"),
    strike: e.isActive("strike"),
    highlight: e.isActive("highlight"),
    code: e.isActive("code"),
    sub: e.isActive("subscript"),
    sup: e.isActive("superscript"),
    link: e.isActive("link"),
    bullet: e.isActive("bulletList"),
    ordered: e.isActive("orderedList"),
    task: e.isActive("taskList"),
    table: e.isActive("table"),
    align:
      ALIGNMENTS.find((a) => e.isActive({ textAlign: a.value }))?.value ??
      "left",
    color: (style.color as string | undefined) ?? null,
    font: (style.fontFamily as string | undefined) ?? "",
    size:
      typeof style.fontSize === "string"
        ? String(Number.parseInt(style.fontSize, 10))
        : "",
  };
}

export type FormatState = NonNullable<ReturnType<typeof selectFormat>>;

/** Live formatting state of the current editor; re-renders only when a value changes. */
export function useFormat(editor: Editor | null) {
  return useEditorState({
    editor: editor && !editor.isDestroyed ? editor : null,
    selector: ({ editor: e }) => selectFormat(e),
  });
}

/** Floating pill toolbar above the page. */
export function EditorControls({
  canEdit = true,
}: {
  canEdit?: boolean;
  isStarred?: boolean;
}) {
  const editor = useStore(editorInstance);
  const f = useFormat(editor);
  const aiOpen = useStore($aiOpen);
  const off = !canEdit || !editor || !f;
  const chain = () => editor?.chain().focus();

  const marks = [
    {
      label: "Bold (Ctrl+B)",
      on: f?.bold,
      run: () => chain()?.toggleBold().run(),
      Icon: Bold,
    },
    {
      label: "Italic (Ctrl+I)",
      on: f?.italic,
      run: () => chain()?.toggleItalic().run(),
      Icon: Italic,
    },
    {
      label: "Underline (Ctrl+U)",
      on: f?.underline,
      run: () => chain()?.toggleUnderline().run(),
      Icon: UnderlineIcon,
    },
    {
      label: "Strikethrough",
      on: f?.strike,
      run: () => chain()?.toggleStrike().run(),
      Icon: Strikethrough,
    },
    {
      label: "Highlight",
      on: f?.highlight,
      run: () => chain()?.toggleHighlight().run(),
      Icon: Highlighter,
    },
  ];
  const lists = [
    {
      label: "Bulleted list",
      on: f?.bullet,
      run: () => chain()?.toggleBulletList().run(),
      Icon: List,
    },
    {
      label: "Numbered list",
      on: f?.ordered,
      run: () => chain()?.toggleOrderedList().run(),
      Icon: ListOrdered,
    },
    {
      label: "Checklist",
      on: f?.task,
      run: () => chain()?.toggleTaskList().run(),
      Icon: CheckSquare,
    },
  ];
  const Align = ALIGNMENTS.find((a) => a.value === f?.align) ?? ALIGNMENTS[0];

  const askAI = AI_ENABLED && (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild>
        <Button
          data-tour="editor-ai"
          variant="ghost"
          onClick={() => editorActions.setAIPanelOpen(!aiOpen)}
          aria-label="Ask AI"
          aria-pressed={aiOpen}
          className={cn(
            "h-8 shrink-0 gap-1.5 rounded-full px-3 text-[13px] text-app hover:bg-app-soft hover:text-app",
            aiOpen && "bg-app-soft",
          )}
        >
          <Sparkles />
          <span className="hidden sm:inline">Ask AI</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Ask AI about this document</TooltipContent>
    </Tooltip>
  );

  if (!canEdit) {
    return (
      <div className="flex items-center gap-1">
        <span className="px-3 text-[13px] text-muted-foreground">
          View only
        </span>
        {askAI}
      </div>
    );
  }

  return (
    <div className="flex w-max items-center gap-0.5">
      <PillButton
        label="Undo (Ctrl+Z)"
        onClick={() => chain()?.undo().run()}
        disabled={off || !f?.undo}
      >
        <Undo2 />
      </PillButton>
      <PillButton
        label="Redo (Ctrl+Y)"
        onClick={() => chain()?.redo().run()}
        disabled={off || !f?.redo}
      >
        <Redo2 />
      </PillButton>
      <ToolbarSeparator />

      <TypographySelector editor={editor} disabled={off} />
      <ToolbarSeparator />

      {marks.map(({ label, on, run, Icon }) => (
        <PillButton
          key={label}
          label={label}
          active={on}
          onClick={run}
          disabled={off}
        >
          <Icon />
        </PillButton>
      ))}
      <ColorMenu editor={editor} color={f?.color ?? null} disabled={off} />
      <ToolbarSeparator />

      {lists.map(({ label, on, run, Icon }) => (
        <PillButton
          key={label}
          label={label}
          active={on}
          onClick={run}
          disabled={off}
        >
          <Icon />
        </PillButton>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <PillButton label="Alignment" disabled={off} className="w-11 gap-0.5">
            <Align.Icon />
            <ChevronDown className="size-3 opacity-60" />
          </PillButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          sideOffset={8}
          className="w-44 min-w-0"
        >
          {ALIGNMENTS.map(({ value, label, Icon }) => (
            <DropdownMenuItem
              key={value}
              onSelect={() => chain()?.setTextAlign(value).run()}
            >
              <Icon />
              {label}
              {f?.align === value && <Check className="ml-auto text-app" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <PillButton
        label="Link"
        active={f?.link}
        onClick={() => editor && promptLink(editor)}
        disabled={off}
      >
        <Link2 />
      </PillButton>

      {f?.table && editor && (
        <span className="studio-pop flex items-center">
          <TableControls editor={editor} disabled={off} />
        </span>
      )}
      <ToolbarSeparator />

      <InsertMenu editor={editor} disabled={off} />
      <OverflowMenu editor={editor} format={f} disabled={off} />
      <ToolbarSeparator />
      {askAI}
    </div>
  );
}

function InsertMenu({
  editor,
  disabled,
}: {
  editor: Editor | null;
  disabled: boolean;
}) {
  return (
    <DropdownMenu>
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              disabled={disabled}
              aria-label="Insert"
              className="group h-8 shrink-0 gap-1 rounded-full bg-app-soft px-2.5 text-[13px] text-app hover:bg-app-soft hover:text-app data-[state=open]:bg-app data-[state=open]:text-app-foreground"
            >
              <Plus className="transition-transform duration-200 group-data-[state=open]:rotate-45" />
              <span className="hidden md:inline">Insert</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Insert a block (or type / on the page)
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="center"
        sideOffset={8}
        className="max-h-[min(70vh,26rem)] w-60 overflow-y-auto"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {INSERT_ITEMS.map((item) => (
          <DropdownMenuItem
            key={item.title}
            className="group h-9"
            onSelect={() => {
              if (!editor) return;
              const at = editor.state.selection.from;
              const range: Range = { from: at, to: at };
              // After the menu has closed, so prompts (embed, equation) keep their focus.
              requestAnimationFrame(() => item.run(editor, range));
            }}
          >
            <BlockIcon icon={item.icon} />
            <span className="flex-1">{item.title}</span>
            {item.hint && (
              <span className="font-mono text-[11px] text-muted-foreground">
                {item.hint}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ColorMenu({
  editor,
  color,
  disabled,
}: {
  editor: Editor | null;
  color: string | null;
  disabled: boolean;
}) {
  const swatch =
    "size-7 h-7 w-7 justify-center rounded-full p-0 ring-offset-2 ring-offset-popover transition-transform duration-150 hover:scale-110 focus:scale-110 data-[highlighted]:bg-transparent";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PillButton label="Text colour" disabled={disabled}>
          <span className="relative flex size-4 flex-col items-center justify-center text-[13px] leading-none font-semibold">
            A
            <span
              className="mt-0.5 h-[3px] w-3.5 rounded-full"
              style={{ background: color ?? "currentColor" }}
            />
          </span>
        </PillButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        sideOffset={8}
        className="w-auto min-w-0 p-2"
      >
        <DropdownMenuLabel className="px-1 pt-0">Text colour</DropdownMenuLabel>
        <div className="grid grid-cols-5 gap-1.5 p-1">
          <DropdownMenuItem
            aria-label="Default colour"
            className={cn(
              swatch,
              "border border-border",
              !color && "ring-2 ring-app",
            )}
            onSelect={() => editor?.chain().focus().unsetColor().run()}
          >
            <Type className="size-3.5" />
          </DropdownMenuItem>
          {TEXT_COLORS.map((c) => (
            <DropdownMenuItem
              key={c.value}
              aria-label={c.label}
              title={c.label}
              className={cn(
                swatch,
                color?.toLowerCase() === c.value.toLowerCase() &&
                  "ring-2 ring-app",
              )}
              style={{ background: c.value }}
              onSelect={() => editor?.chain().focus().setColor(c.value).run()}
            />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function OverflowMenu({
  editor,
  format: f,
  disabled,
}: {
  editor: Editor | null;
  format: FormatState | null;
  disabled: boolean;
}) {
  const chain = () => editor?.chain().focus();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PillButton label="More options">
          <MoreHorizontal />
        </PillButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={disabled}>
            <Type />
            Font
            <span className="ml-auto truncate pl-3 text-xs text-muted-foreground">
              {f?.font || "Figtree"}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-80 w-52 overflow-y-auto">
            <DropdownMenuRadioGroup
              value={f?.font ?? ""}
              onValueChange={(v) =>
                v
                  ? chain()?.setFontFamily(v).run()
                  : chain()?.unsetFontFamily().run()
              }
            >
              <DropdownMenuRadioItem value="">
                Figtree (default)
              </DropdownMenuRadioItem>
              {FONTS.map((font) => (
                <DropdownMenuRadioItem
                  key={font}
                  value={font}
                  style={{ fontFamily: font }}
                >
                  {font}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={disabled}>
            <span className="w-[15px] text-center text-[11px] font-semibold text-muted-foreground">
              Aa
            </span>
            Size
            <span className="ml-auto pl-3 text-xs tabular-nums text-muted-foreground">
              {f?.size || "Default"}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-80 w-40 overflow-y-auto">
            <DropdownMenuRadioGroup
              value={f?.size ?? ""}
              onValueChange={(v) =>
                v
                  ? chain()?.setFontSize(`${v}px`).run()
                  : chain()?.unsetFontSize().run()
              }
            >
              <DropdownMenuRadioItem value="">Default</DropdownMenuRadioItem>
              {SIZES.map((s) => (
                <DropdownMenuRadioItem
                  key={s}
                  value={String(s)}
                  className="tabular-nums"
                >
                  {s}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={disabled}
          onSelect={() => chain()?.toggleCode().run()}
        >
          <Code />
          Inline code
          {f?.code && <Check className="ml-auto text-app" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={disabled}
          onSelect={() => chain()?.toggleSuperscript().run()}
        >
          <Superscript />
          Superscript
          {f?.sup && <Check className="ml-auto text-app" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={disabled}
          onSelect={() => chain()?.toggleSubscript().run()}
        >
          <Subscript />
          Subscript
          {f?.sub && <Check className="ml-auto text-app" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={disabled}
          onSelect={() => chain()?.unsetAllMarks().run()}
        >
          <Eraser />
          Clear formatting
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={toggleFocusMode}>
          <Maximize2 />
          Focus mode
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={dispatch("document-print-requested")}>
          <Printer />
          Print or save as PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={disabled}
          onSelect={dispatch("document-copy-requested")}
        >
          <Copy />
          Make a copy
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const PROCESSING_LABELS: Record<string, string> = {
  analyzing: "Analyzing contract...",
  explaining: "Explaining...",
  summarizing: "Summarizing...",
};

const plural = (n: number, one: string) =>
  `${n.toLocaleString()} ${n === 1 ? one : `${one}s`}`;

/** Small floating pill, bottom left: words, pages, words added today. Click for reading time. */
export function EditorStatusBar({ className }: { className?: string }) {
  const { wordCount, totalPages, aiProcessing } = useStore(editorUIState);
  const wordsToday = useStore($wordsToday);
  const [reading, setReading] = useState(false);
  const pages = totalPages ?? 1;
  const minutes = Math.max(1, Math.round(wordCount / 230));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => setReading((r) => !r)}
        aria-label={reading ? "Show word count" : "Show reading time"}
        title={reading ? "Show word count" : "Show reading time"}
        className="press flex h-8 items-center gap-3 rounded-full bg-card px-3.5 text-xs tabular-nums text-muted-foreground shadow-card outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        <span
          key={reading ? "r" : "w"}
          className="animate-in fade-in slide-in-from-bottom-1 duration-200"
        >
          {reading ? `${minutes} min read` : plural(wordCount, "word")}
        </span>
        <span>{plural(pages, "page")}</span>
        {wordsToday > 0 && (
          <span
            className="font-medium text-app"
            title="Words you added today, across all documents"
          >
            +{wordsToday.toLocaleString()} today
          </span>
        )}
      </button>
      {aiProcessing && PROCESSING_LABELS[aiProcessing] && (
        <span className="flex h-8 items-center gap-1.5 rounded-full bg-card px-3 text-xs text-app shadow-card">
          <span className="size-3 animate-spin rounded-full border-2 border-app border-t-transparent" />
          {PROCESSING_LABELS[aiProcessing]}
        </span>
      )}
    </div>
  );
}
