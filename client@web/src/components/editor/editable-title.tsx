"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const MAX = 100;

interface EditableTitleProps {
  title: string;
  documentId: string;
  canRename?: boolean;
  /** Controlled editing (the header's Rename menu item); uncontrolled when omitted. */
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  onTitleChange?: (newTitle: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * The file name. Click to rename: the text is selected, Enter or leaving saves, Esc cancels.
 * Saving is optimistic: the new name shows at once and reverts (with a toast) if the save fails.
 * The input sizes to its text so nothing around it moves while typing.
 */
export function EditableTitle({
  title,
  documentId,
  canRename = true,
  editing: editingProp,
  onEditingChange,
  onTitleChange,
  placeholder = "Untitled",
  className,
}: EditableTitleProps) {
  const [editingState, setEditingState] = useState(false);
  const editing = (editingProp ?? editingState) && canRename;
  const setEditing = (on: boolean) => {
    setEditingState(on);
    onEditingChange?.(on);
  };
  const [draft, setDraft] = useState(title);
  // Optimistic name, valid only while the stored title is still the one it replaced.
  const [pending, setPending] = useState<{
    value: string;
    over: string;
  } | null>(null);
  const { updateDocument } = useCloudStore();
  const input = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);

  const shown = pending && pending.over === title ? pending.value : title;

  // biome-ignore lint/correctness/useExhaustiveDependencies: seed the draft only when editing starts
  useEffect(() => {
    if (!editing) return;
    setDraft(shown);
    cancelled.current = false;
    requestAnimationFrame(() => input.current?.select());
  }, [editing]);

  const commit = async () => {
    setEditing(false);
    if (cancelled.current) return;
    const next = draft.trim().slice(0, MAX);
    if (!next || next === shown) return;
    setPending({ value: next, over: title });
    const ok = await updateDocument(documentId, { title: next }).catch(
      () => false,
    );
    if (ok) onTitleChange?.(next);
    else {
      setPending(null);
      showToast.error(
        "Could not rename",
        "The name was put back. Check your connection and try again.",
      );
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      input.current?.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancelled.current = true;
      input.current?.blur();
    }
  };

  const text =
    "font-display text-[15px] font-semibold leading-[26px] tracking-[-0.015em]";

  if (editing) {
    return (
      <span className={cn("inline-grid min-w-[4ch] max-w-full", className)}>
        {/* Invisible twin that gives the input its width. */}
        <span
          aria-hidden
          className={cn(
            text,
            "invisible col-start-1 row-start-1 whitespace-pre px-1.5",
          )}
        >
          {draft || placeholder}
        </span>
        <input
          ref={input}
          value={draft}
          maxLength={MAX}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => void commit()}
          aria-label="File name"
          placeholder={placeholder}
          spellCheck={false}
          className={cn(
            text,
            "col-start-1 row-start-1 h-[26px] w-full min-w-0 rounded-[6px] bg-card px-1.5 text-foreground outline-none ring-2 ring-app/35 selection:bg-app/20",
          )}
        />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => canRename && setEditing(true)}
      aria-label={canRename ? `Rename: ${shown || placeholder}` : undefined}
      aria-disabled={!canRename}
      title={canRename ? "Rename" : undefined}
      className={cn(
        text,
        "block h-[26px] min-w-0 max-w-full truncate rounded-[6px] px-1.5 text-left text-foreground outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring/40",
        canRename ? "cursor-text hover:bg-accent" : "cursor-default",
        !shown && "text-muted-foreground",
        className,
      )}
    >
      {shown || placeholder}
    </button>
  );
}
