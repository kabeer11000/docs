"use client";
import { useStore } from "@nanostores/react";
import {
  Bold,
  Highlighter,
  Italic,
  Link2,
  MessageSquarePlus,
  Sparkles,
  Underline,
} from "lucide-react";
import type React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { editorInstance } from "@/state/editor";
import { useFormat } from "./editor-controls";
import { promptLink } from "./extensions/slash-command";
import { PillButton, ToolbarSeparator } from "./toolbar-button";

interface SelectionMenuProps {
  isVisible: boolean;
  /** Centre of the selection's top edge, viewport px. */
  position: { x: number; y: number };
  onComment: () => void;
  onAskLexa: () => void;
}

const EDGE = 12;

/** Compact pill above a text selection: quick marks, link, comment, Ask AI. */
export const SelectionMenu: React.FC<SelectionMenuProps> = ({
  isVisible,
  position,
  onComment,
  onAskLexa,
}) => {
  const editor = useStore(editorInstance);
  const f = useFormat(editor);
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{
    left: number;
    top: number;
    below: boolean;
  } | null>(null);

  // Centre over the selection, kept inside the viewport; flips below when there is no room above.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!isVisible || !el) return setPlace(null);
    const { width, height } = el.getBoundingClientRect();
    const left = Math.min(
      Math.max(position.x - width / 2, EDGE),
      window.innerWidth - width - EDGE,
    );
    const below = position.y - height - 10 < EDGE;
    setPlace({
      left,
      top: below ? position.y + 28 : position.y - height - 10,
      below,
    });
  }, [isVisible, position]);

  if (!isVisible || !editor) return null;
  const edit = editor.isEditable;
  const chain = () => editor.chain().focus();
  const marks = [
    {
      label: "Bold",
      on: f?.bold,
      run: () => chain().toggleBold().run(),
      Icon: Bold,
    },
    {
      label: "Italic",
      on: f?.italic,
      run: () => chain().toggleItalic().run(),
      Icon: Italic,
    },
    {
      label: "Underline",
      on: f?.underline,
      run: () => chain().toggleUnderline().run(),
      Icon: Underline,
    },
    {
      label: "Highlight",
      on: f?.highlight,
      run: () => chain().toggleHighlight().run(),
      Icon: Highlighter,
    },
  ];

  return (
    <div
      ref={ref}
      data-selection-menu
      role="toolbar"
      aria-label="Selection"
      className={
        place ? (place.below ? "studio-pop-down" : "studio-pop") : "invisible"
      }
      style={{
        position: "fixed",
        zIndex: 50,
        left: place?.left ?? position.x,
        top: place?.top ?? position.y,
      }}
      onMouseDown={(e) => {
        // Keep the text selected while using the menu.
        e.stopPropagation();
        if ((e.target as HTMLElement).closest("button")) e.preventDefault();
      }}
    >
      <div className="flex items-center gap-0.5 rounded-full bg-card p-1 shadow-float">
        {edit && (
          <>
            {marks.map(({ label, on, run, Icon }) => (
              <PillButton key={label} label={label} active={on} onClick={run}>
                <Icon />
              </PillButton>
            ))}
            <PillButton
              label={f?.link ? "Remove link" : "Link"}
              active={f?.link}
              onClick={() => promptLink(editor)}
            >
              <Link2 />
            </PillButton>
            <ToolbarSeparator />
          </>
        )}
        <PillButton label="Comment" onClick={onComment}>
          <MessageSquarePlus />
        </PillButton>
        <Button
          variant="ghost"
          onClick={onAskLexa}
          className="h-8 gap-1.5 rounded-full px-3 text-[13px] text-app hover:bg-app-soft hover:text-app"
        >
          <Sparkles />
          Ask AI
        </Button>
      </div>
    </div>
  );
};
