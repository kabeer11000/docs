"use client";
import { useStore } from "@nanostores/react";
import { CaseSensitive, ChevronDown, ChevronUp, Replace, WholeWord, X } from "lucide-react";
import { type ReactNode, useEffect, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { editorInstance } from "@/state/editor";
import { getFind, replaceAll, replaceCurrent, setFind, stepFind } from "./find-extension";

const field =
  "h-8 min-w-0 flex-1 rounded-full border border-input bg-background px-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-app focus-visible:ring-[3px] focus-visible:ring-app/20";
const textButton = "h-8 rounded-full px-3 text-[13px]";

function IconButton({
  label,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn("size-8 rounded-full text-muted-foreground", pressed && "bg-app-soft text-app hover:bg-app-soft hover:text-app")}
    >
      {children}
    </Button>
  );
}

export function FindBar({ canEdit }: { canEdit: boolean }) {
  const editor = useStore(editorInstance);
  const [open, setOpen] = useState(false);
  const [withReplace, setWithReplace] = useState(false);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const findInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key !== "f" && key !== "h") return;
      e.preventDefault();
      const replace = key === "h" && canEdit;
      if (editor && !editor.isDestroyed) {
        const { from, to } = editor.state.selection;
        const selected = editor.state.doc.textBetween(from, to, " ");
        if (selected.trim() && selected.length < 200) setQuery(selected);
      }
      setOpen(true);
      if (replace) setWithReplace(true);
      requestAnimationFrame(() => {
        const target = replace ? replaceInput.current : findInput.current;
        target?.focus();
        target?.select();
      });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editor, canEdit]);

  // Search follows the input while open; closing clears the highlights.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (open) setFind(editor, { query, index: 0 });
    else if (getFind(editor)?.query) setFind(editor, { query: "", index: 0 });
  }, [editor, open, query]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !open) return;
    rerender();
    editor.on("transaction", rerender);
    return () => {
      editor.off("transaction", rerender);
    };
  }, [editor, open]);

  const state = editor && !editor.isDestroyed ? getFind(editor) : undefined;
  const total = state?.matches.length ?? 0;
  const current = state?.matches[state.index];
  const index = state?.index;
  const searched = state?.query;

  // Scroll when the user moves between matches, not on every edit.
  useEffect(() => {
    if (!open || !editor || editor.isDestroyed || index === undefined || !searched) return;
    editor.view.dom.querySelector(".find-match-current")?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [open, editor, index, searched]);

  if (!open || !editor || !state) return null;
  const allowReplace = canEdit && editor.isEditable;

  const close = () => {
    setOpen(false);
    if (current) editor.chain().focus().setTextSelection(current).run();
    else editor.commands.focus();
  };

  const onEnter = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    action();
  };

  return (
    <div className="sticky top-16 z-20 h-0">
      <div
        role="search"
        aria-label="Find in document"
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          e.preventDefault();
          close();
        }}
        className="studio-pop absolute top-2 right-0 flex w-[25rem] max-w-[calc(100vw-1.5rem)] flex-col gap-1.5 rounded-[14px] bg-popover p-2 font-sans text-popover-foreground shadow-float"
      >
        <div className="flex items-center gap-0.5">
          {allowReplace && (
            <IconButton label="Show replace" pressed={withReplace} onClick={() => setWithReplace((w) => !w)}>
              <Replace />
            </IconButton>
          )}
          <input
            ref={findInput}
            aria-label="Find"
            placeholder="Find in document"
            className={field}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => onEnter(e, () => stepFind(editor, e.shiftKey ? -1 : 1))}
          />
          <span className="w-16 shrink-0 text-center text-xs tabular-nums text-muted-foreground" aria-live="polite">
            {state.query ? (total ? `${state.index + 1} of ${total}` : "No results") : ""}
          </span>
          <IconButton label="Match case" pressed={state.caseSensitive} onClick={() => setFind(editor, { caseSensitive: !state.caseSensitive })}>
            <CaseSensitive />
          </IconButton>
          <IconButton label="Whole word" pressed={state.wholeWord} onClick={() => setFind(editor, { wholeWord: !state.wholeWord })}>
            <WholeWord />
          </IconButton>
          <IconButton label="Previous match" disabled={!total} onClick={() => stepFind(editor, -1)}>
            <ChevronUp />
          </IconButton>
          <IconButton label="Next match" disabled={!total} onClick={() => stepFind(editor, 1)}>
            <ChevronDown />
          </IconButton>
          <IconButton label="Close find" onClick={close}>
            <X />
          </IconButton>
        </div>
        {allowReplace && withReplace && (
          <div className="flex items-center gap-1 pl-8.5">
            <input
              ref={replaceInput}
              aria-label="Replace with"
              placeholder="Replace with"
              className={field}
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              onKeyDown={(e) => onEnter(e, () => replaceCurrent(editor, replacement))}
            />
            <Button type="button" variant="ghost" className={textButton} disabled={!total} onClick={() => replaceCurrent(editor, replacement)}>
              Replace
            </Button>
            <Button type="button" variant="ghost" className={textButton} disabled={!total} onClick={() => replaceAll(editor, replacement)}>
              Replace all
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
