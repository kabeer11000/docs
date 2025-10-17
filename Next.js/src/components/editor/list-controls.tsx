"use client";
import { useStore } from "@nanostores/react";
import { Indent, List, ListOrdered, Outdent } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  editorActions,
  editorFormatState,
  editorInstance,
} from "@/state/editor";

export function ListControls({ disabled = false }: { disabled?: boolean }) {
  const formatState = useStore(editorFormatState);

  const handleIndent = () => {
    const editor = editorInstance.get();
    if (!editor) return;

    try {
      // For bullet and ordered lists, increase nesting level
      if (formatState.isBulletList || formatState.isOrderedList) {
        editor.chain().focus().sinkListItem("listItem").run();
      }
    } catch (error) {
      console.warn("Error indenting list:", error);
    }
  };

  const handleOutdent = () => {
    const editor = editorInstance.get();
    if (!editor) return;

    try {
      // For bullet and ordered lists, decrease nesting level
      if (formatState.isBulletList || formatState.isOrderedList) {
        editor.chain().focus().liftListItem("listItem").run();
      }
    } catch (error) {
      console.warn("Error outdenting list:", error);
    }
  };

  const isInList = formatState.isBulletList || formatState.isOrderedList;

  return (
    <div className="flex items-center gap-0.5">
      {/* Simple Bullet List Button */}
      <Button
        variant={formatState.isBulletList ? "default" : "ghost"}
        size="sm"
        onClick={editorActions.toggleBulletList}
        disabled={disabled}
        className={`h-7 w-7 sm:h-8 sm:w-8 p-0 transition-all ${
          formatState.isBulletList
            ? "bg-primary text-primary-foreground shadow-sm"
            : "hover:bg-muted"
        }`}
        aria-label="Bullet list"
      >
        <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </Button>

      {/* Simple Numbered List Button */}
      <Button
        variant={formatState.isOrderedList ? "default" : "ghost"}
        size="sm"
        onClick={editorActions.toggleOrderedList}
        disabled={disabled}
        className={`h-7 w-7 sm:h-8 sm:w-8 p-0 transition-all ${
          formatState.isOrderedList
            ? "bg-primary text-primary-foreground shadow-sm"
            : "hover:bg-muted"
        }`}
        aria-label="Numbered list"
      >
        <ListOrdered className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </Button>

      {/* Indent/Outdent Controls - Only show when in a list and on larger screens */}
      {isInList && (
        <>
          <div className="hidden sm:block">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOutdent}
              disabled={disabled}
              className="h-8 w-8 p-0 transition-all hover:bg-muted"
              aria-label="Decrease indent"
            >
              <Outdent className="h-4 w-4" />
            </Button>
          </div>
          <div className="hidden sm:block">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleIndent}
              disabled={disabled}
              className="h-8 w-8 p-0 transition-all hover:bg-muted"
              aria-label="Increase indent"
            >
              <Indent className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
