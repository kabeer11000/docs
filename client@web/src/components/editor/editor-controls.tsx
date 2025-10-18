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
  Printer,
  Quote,
  ShipWheel,
  Star,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";
import { computed } from "nanostores";
import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { showToast } from "@/lib/toast";
import {
  editorActions,
  editorFormatState,
  editorInstance,
  editorUIState,
} from "@/state/editor";
import { FontSelector } from "./font-selector";
import { FontSizeSelector } from "./font-size-selector";
import { ListControls } from "./list-controls";
import { TableControls } from "./table-controls";
import { TypographySelector } from "./typography-selector";

const _SummarizeButton = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [pendingSummary, setPendingSummary] = React.useState<string | null>(
    null,
  );
  const [showSuccess, setShowSuccess] = React.useState(false);

  return (
    <Button
      variant={"ghost"}
      size="sm"
      disabled={isLoading}
      onClick={async () => {
        try {
          const editor = editorInstance.get();
          if (!editor) return;

          // If we have a pending summary, place it at cursor
          if (pendingSummary) {
            // Insert plain text first
            const startPos = editor.state.selection.from;
            editor.chain().focus().insertContent(pendingSummary).run();
            const endPos = startPos + pendingSummary.length;

            setTimeout(() => {
              // Select the newly inserted text
              editor
                .chain()
                .focus()
                .setTextSelection({ from: startPos, to: endPos })
                .run();
            }, 200);

            // Trigger success animation
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 300);

            setPendingSummary(null);
            return;
          }

          // Otherwise, start summarization process
          const selectedText = editorUIState.get().selectedText;

          if (!selectedText.trim()) {
            return; // No text selected
          }

          // Show loading indicator
          setIsLoading(true);

          const response = await fetch(
            "https://lexa-ai-983624625569.europe-west1.run.app/summarize",
            {
              method: "POST",
              headers: {
                accept: "application/json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: selectedText,
                summary_type: "general",
              }),
            },
          );

          if (!response.ok) {
            const errorMessage =
              response.status === 404
                ? "Summary service not available"
                : response.status === 500
                  ? "Server error occurred"
                  : response.status === 429
                    ? "Too many requests, please try again later"
                    : `Request failed (${response.status})`;

            throw new Error(errorMessage);
          }

          const data: {
            original_text_length: number;
            summary: string;
            summary_length: number;
            summary_type: "general";
          } = await response.json();

          if (!data.summary || !data.summary.trim()) {
            throw new Error("Empty summary received from server");
          }

          // Store summary for placement
          setPendingSummary(data.summary);

          // Clear selection and selected text
          // editor.chain().focus().setTextSele ction(editor.state.selection.to).run();
          editorActions.setSelectedText("");

          // Trigger success animation
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 300);
        } catch (error) {
          console.error("Error summarizing text:", error);

          // Show user-friendly error message
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
          showToast.error("Failed to generate summary", errorMessage);
        } finally {
          setIsLoading(false);
        }
      }}
      className={`cursor-pointer overflow-hidden duration-150 transition-all flex ${isLoading ? "opacity-50" : ""} ${pendingSummary ? "summary-ready" : ""} ${showSuccess ? "summary-success text-white" : ""}`}
      style={{
        background: pendingSummary
          ? `url(/assets/ai-button-bg.png)`
          : undefined,
      }}
      aria-label="Lexa AI"
    >
      <ShipWheel className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
      <span>
        {isLoading
          ? "Summarizing..."
          : pendingSummary
            ? "Place Summary"
            : "Summarize"}
      </span>
    </Button>
  );
};
export function EditorControls({ canEdit = true, isStarred = false }: { canEdit?: boolean; isStarred?: boolean }) {
  const formatState = useStore(editorFormatState);
  // const canUndoAction = useStore(canUndo);
  // const canRedoAction = useStore(canRedo);

  return (
    <ScrollArea className="w-full toolbar-scroll">
      <div className="flex items-center justify-center gap-2 w-full">
        {/* Undo/Redo */}
        {/* <div className="flex items-center gap-0.5 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={editorActions.undo}
              disabled={!canUndoAction}
              aria-label="Undo"
              className="h-5 w-5 sm:h-6 sm:w-6 p-0 transition-all hover:bg-muted disabled:opacity-50"
            >
              <Undo className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={editorActions.redo}
              disabled={!canRedoAction}
              aria-label="Redo"
              className="h-5 w-5 sm:h-6 sm:w-6 p-0 transition-all hover:bg-muted disabled:opacity-50"
            >
              <Redo className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div> */}

        {/* <div className="w-px h-4 sm:h-5 bg-border mx-1 sm:mx-2 flex-shrink-0" /> */}

        {/* Typography & Font Controls */}
        <div className="flex items-center gap-1">
          <TypographySelector disabled={!canEdit} />
          <FontSelector disabled={!canEdit} />
          <FontSizeSelector disabled={!canEdit} />
        </div>

        <div className="w-px h-5 bg-border mx-2" />

        {/* Text Formatting */}
        <div className="flex items-center gap-1">
          <Button
            variant={formatState.isBold ? "default" : "ghost"}
            size="sm"
            onClick={editorActions.toggleBold}
            className="h-8 w-8 p-0"
            aria-label="Bold"
            disabled={!canEdit}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant={formatState.isItalic ? "default" : "ghost"}
            size="sm"
            onClick={editorActions.toggleItalic}
            className="h-8 w-8 p-0"
            aria-label="Italic"
            disabled={!canEdit}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant={formatState.isUnderline ? "default" : "ghost"}
            size="sm"
            onClick={editorActions.toggleUnderline}
            className="h-8 w-8 p-0"
            aria-label="Underline"
            disabled={!canEdit}
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={formatState.isStrikethrough ? "default" : "ghost"}
            size="sm"
            onClick={editorActions.toggleStrikethrough}
            className="h-8 w-8 p-0"
            aria-label="Strikethrough"
            disabled={!canEdit}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-5 bg-border mx-2" />

        {/* List Controls */}
        <ListControls disabled={!canEdit} />

        <div className="w-px h-5 bg-border mx-2" />

        {/* Text Alignment */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editorActions.setTextAlign("left")}
            className="h-8 w-8 p-0"
            aria-label="Align Left"
            disabled={!canEdit}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editorActions.setTextAlign("center")}
            className="h-8 w-8 p-0"
            aria-label="Align Center"
            disabled={!canEdit}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editorActions.setTextAlign("right")}
            className="h-8 w-8 p-0"
            aria-label="Align Right"
            disabled={!canEdit}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editorActions.setTextAlign("justify")}
            className="h-8 w-8 p-0"
            aria-label="Justify"
            disabled={!canEdit}
          >
            <AlignJustify className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-5 bg-border mx-2" />

        {/* Table Controls */}
        <div className="flex items-center gap-1">
          <TableControls disabled={!canEdit} />
        </div>

        <div className="w-px h-5 bg-border mx-2" />

        {/* Blockquote & Code */}
        <div className="flex items-center gap-1">
          <Button
            variant={formatState.isBlockquote ? "default" : "ghost"}
            size="sm"
            onClick={editorActions.toggleBlockquote}
            className="h-8 w-8 p-0"
            aria-label="Blockquote"
            disabled={!canEdit}
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            variant={formatState.isCode ? "default" : "ghost"}
            size="sm"
            onClick={editorActions.toggleCode}
            className="h-8 w-8 p-0"
            aria-label="Code"
            disabled={!canEdit}
          >
            <Code className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-5 bg-border mx-2" />

        {/* Document Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Trigger print via custom event
              window.dispatchEvent(new CustomEvent("document-print-requested"));
            }}
            className="h-8 w-8 p-0"
            aria-label="Print / Download as PDF"
          >
            <Printer className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Trigger copy via custom event
              window.dispatchEvent(new CustomEvent("document-copy-requested"));
            }}
            className="h-8 w-8 p-0"
            aria-label="Make a copy"
            disabled={!canEdit}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Trigger star event via custom event
              window.dispatchEvent(new CustomEvent("document-star-requested"));
            }}
            className="h-8 w-8 p-0"
            aria-label={isStarred ? "Remove from starred" : "Add to starred"}
          >
            <Star 
              className={`h-4 w-4 ${isStarred ? "fill-current text-yellow-500" : ""}`} 
            />
          </Button>
        </div>
      </div>
      <ScrollBar orientation="horizontal" className="opacity-100" />
    </ScrollArea>
  );
}

interface EditorStatusBarProps {
  className?: string;
}

export function EditorStatusBar({ className }: EditorStatusBarProps) {
  const wordCount = useStore(
    computed(editorUIState, (state) => state.wordCount),
  );
  const characterCount = useStore(
    computed(editorUIState, (state) => state.characterCount),
  );
  const totalPages = useStore(
    computed(editorUIState, (state) => state.totalPages),
  );
  const aiProcessing = useStore(
    computed(editorUIState, (state) => state.aiProcessing),
  );

  const getProcessingLabel = (type: string) => {
    switch (type) {
      case "analyzing":
        return "Analyzing contract...";
      case "explaining":
        return "Explaining...";
      case "summarizing":
        return "Summarizing...";
      default:
        return "";
    }
  };

  return (
    <div
      className={`absolute bottom-0 w-full mt-auto flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-t- bg-muted/10 ${className || ""}`}
    >
      <div className="flex items-center gap-4">
        <span>Words: {wordCount}</span>
        <span>Characters: {characterCount}</span>
        {aiProcessing && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>{getProcessingLabel(aiProcessing)}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span>Pages: {totalPages ?? 1}</span>
      </div>
    </div>
  );
}
