"use client";
import { useStore } from "@nanostores/react";
import { Indent, List, ListOrdered, Outdent } from "lucide-react";
import {
  editorActions,
  editorFormatState,
  editorInstance,
} from "@/state/editor";
import { ToolbarButton } from "./toolbar-button";

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
      <ToolbarButton
        label="Bulleted list"
        active={formatState.isBulletList}
        onClick={editorActions.toggleBulletList}
        disabled={disabled}
      >
        <List />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={formatState.isOrderedList}
        onClick={editorActions.toggleOrderedList}
        disabled={disabled}
      >
        <ListOrdered />
      </ToolbarButton>
      {isInList && (
        <>
          <ToolbarButton
            label="Decrease indent"
            onClick={handleOutdent}
            disabled={disabled}
            className="hidden sm:inline-flex"
          >
            <Outdent />
          </ToolbarButton>
          <ToolbarButton
            label="Increase indent"
            onClick={handleIndent}
            disabled={disabled}
            className="hidden sm:inline-flex"
          >
            <Indent />
          </ToolbarButton>
        </>
      )}
    </div>
  );
}
