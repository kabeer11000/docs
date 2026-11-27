import { $wordsToday } from "./core/use-writing-memory";
import { useStore } from "@nanostores/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Copy,
  Italic,
  MessageSquare,
  Printer,
  Quote,
  Redo,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  canRedo,
  canUndo,
  editorActions,
  editorFormatState,
  editorUIState,
} from "@/state/editor";
import { FontSelector } from "./font-selector";
import { FontSizeSelector } from "./font-size-selector";
import { ListControls } from "./list-controls";
import { TableControls } from "./table-controls";
import { ToolbarButton, ToolbarSeparator } from "./toolbar-button";
import { TypographySelector } from "./typography-selector";

const dispatch = (name: string) => () =>
  window.dispatchEvent(new CustomEvent(name));

const ALIGNMENTS = [
  { value: "left", label: "Align left", Icon: AlignLeft },
  { value: "center", label: "Align center", Icon: AlignCenter },
  { value: "right", label: "Align right", Icon: AlignRight },
  { value: "justify", label: "Justify", Icon: AlignJustify },
] as const;

// isStarred is kept for API compatibility; the star toggle now lives in the header.
export function EditorControls({
  canEdit = true,
}: {
  canEdit?: boolean;
  isStarred?: boolean;
}) {
  const formatState = useStore(editorFormatState);
  const canUndoAction = useStore(canUndo);
  const canRedoAction = useStore(canRedo);
  const disabled = !canEdit;

  const marks = [
    { label: "Bold (Ctrl+B)", active: formatState.isBold, onClick: editorActions.toggleBold, Icon: Bold },
    { label: "Italic (Ctrl+I)", active: formatState.isItalic, onClick: editorActions.toggleItalic, Icon: Italic },
    { label: "Underline (Ctrl+U)", active: formatState.isUnderline, onClick: editorActions.toggleUnderline, Icon: UnderlineIcon },
    { label: "Strikethrough", active: formatState.isStrikethrough, onClick: editorActions.toggleStrikethrough, Icon: Strikethrough },
  ];

  return (
    <div className="flex items-center gap-0.5">
      <ToolbarButton label="Undo (Ctrl+Z)" onClick={editorActions.undo} disabled={!canUndoAction}>
        <Undo />
      </ToolbarButton>
      <ToolbarButton label="Redo (Ctrl+Y)" onClick={editorActions.redo} disabled={!canRedoAction}>
        <Redo />
      </ToolbarButton>

      <ToolbarSeparator />
      <TypographySelector disabled={disabled} />
      <ToolbarSeparator />
      <FontSelector disabled={disabled} />
      <ToolbarSeparator />
      <FontSizeSelector disabled={disabled} />
      <ToolbarSeparator />

      {marks.map(({ label, active, onClick, Icon }) => (
        <ToolbarButton key={label} label={label} active={active} onClick={onClick} disabled={disabled}>
          <Icon />
        </ToolbarButton>
      ))}

      <ToolbarSeparator />
      <ListControls disabled={disabled} />
      <ToolbarSeparator />

      {ALIGNMENTS.map(({ value, label, Icon }) => (
        <ToolbarButton key={value} label={label} onClick={() => editorActions.setTextAlign(value)} disabled={disabled}>
          <Icon />
        </ToolbarButton>
      ))}

      <ToolbarSeparator />
      <TableControls disabled={disabled} />
      <ToolbarButton label="Quote" active={formatState.isBlockquote} onClick={editorActions.toggleBlockquote} disabled={disabled}>
        <Quote />
      </ToolbarButton>
      <ToolbarButton label="Inline code" active={formatState.isCode} onClick={editorActions.toggleCode} disabled={disabled}>
        <Code />
      </ToolbarButton>

      <ToolbarSeparator />
      <ToolbarButton
        label="Comments"
        onClick={() => editorActions.setCommentsSidebarOpen(!editorUIState.get().isCommentsSidebarOpen)}
        className="md:hidden"
      >
        <MessageSquare />
      </ToolbarButton>
      <ToolbarButton label="Print or save as PDF" onClick={dispatch("document-print-requested")}>
        <Printer />
      </ToolbarButton>
      <ToolbarButton label="Make a copy" onClick={dispatch("document-copy-requested")} disabled={disabled}>
        <Copy />
      </ToolbarButton>
    </div>
  );
}

interface EditorStatusBarProps {
  className?: string;
}

const PROCESSING_LABELS: Record<string, string> = {
  analyzing: "Analyzing contract...",
  explaining: "Explaining...",
  summarizing: "Summarizing...",
};

export function EditorStatusBar({ className }: EditorStatusBarProps) {
  const { wordCount, characterCount, totalPages, aiProcessing } =
    useStore(editorUIState);
  const wordsToday = useStore($wordsToday);

  return (
    <div
      className={cn(
        "flex h-7 items-center gap-4 px-4 text-xs text-muted-foreground tabular-nums",
        className,
      )}
    >
      <span>
        {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}
      </span>
      <span>{characterCount.toLocaleString()} characters</span>
      <span>
        {totalPages ?? 1} {(totalPages ?? 1) === 1 ? "page" : "pages"}
      </span>
      {wordsToday > 0 && (
        <span title="Words you added today, across all documents">
          +{wordsToday.toLocaleString()} today
        </span>
      )}
      {aiProcessing && PROCESSING_LABELS[aiProcessing] && (
        <span className="ml-auto flex items-center gap-1.5 text-primary">
          <span className="size-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          {PROCESSING_LABELS[aiProcessing]}
        </span>
      )}
    </div>
  );
}
