"use client";
import { MessagesSquare, X } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FILTERS, type Thread, type ThreadFilter } from "./threads";

const EMPTY: Record<ThreadFilter, string> = {
  all: "No comments yet",
  open: "No open comments",
  resolved: "No resolved comments",
  mine: "Nothing from you yet",
};

interface CommentsPanelProps {
  open: boolean;
  onClose: () => void;
  filter: ThreadFilter;
  onFilter: (f: ThreadFilter) => void;
  counts: Record<ThreadFilter, number>;
  anchored: Thread[];
  detached: Thread[];
  activeId: string | null;
  canComment: boolean;
  /** The new-comment card, when one is being written. */
  composer: ReactNode;
  renderCard: (t: Thread) => ReactNode;
}

/** Every thread in document order, filtered; arrow keys move between threads, Enter jumps to one. */
export function CommentsPanel({
  open,
  onClose,
  filter,
  onFilter,
  counts,
  anchored,
  detached,
  activeId,
  canComment,
  composer,
  renderCard,
}: CommentsPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !activeId) return;
    listRef.current
      ?.querySelector(`[data-thread-card="${CSS.escape(activeId)}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open, activeId]);

  const onKeyDown = (e: KeyboardEvent) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-thread-card]",
    );
    if (!card || card !== e.target) return;
    const cards = [
      ...(listRef.current?.querySelectorAll<HTMLElement>(
        "[data-thread-card]",
      ) ?? []),
    ];
    const i = cards.indexOf(card);
    const next =
      e.key === "ArrowDown"
        ? cards[i + 1]
        : e.key === "ArrowUp"
          ? cards[i - 1]
          : e.key === "Home"
            ? cards[0]
            : e.key === "End"
              ? cards.at(-1)
              : null;
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  const empty = !anchored.length && !detached.length && !composer;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        aria-label="Comments"
        inert={!open}
        className={cn(
          "fixed top-0 right-0 z-50 flex h-full w-full flex-col border-l border-border bg-background transition-transform duration-200 ease-out md:w-80",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between pr-2 pl-4">
          <h2 className="text-[13px] font-medium text-foreground">Comments</h2>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={onClose}
            aria-label="Close comments"
          >
            <X />
          </Button>
        </div>

        <fieldset className="mx-3 mb-2 flex shrink-0 gap-0.5 rounded-full bg-muted p-0.5">
          <legend className="sr-only">Show</legend>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => onFilter(f.id)}
              className={cn(
                "flex h-7 flex-1 items-center justify-center gap-1 rounded-full text-xs font-medium transition-colors duration-150",
                filter === f.id
                  ? "bg-card text-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
              <span className="tabular-nums text-muted-foreground">
                {counts[f.id]}
              </span>
            </button>
          ))}
        </fieldset>

        {/* biome-ignore lint/a11y/noStaticElementInteractions: arrow keys move focus between the cards inside */}
        <div
          ref={listRef}
          onKeyDown={onKeyDown}
          className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pt-1 pb-6"
        >
          {composer}
          {empty && (
            <div className="flex flex-col items-center px-4 py-14 text-center">
              <MessagesSquare
                className="mb-3 size-6 text-muted-foreground"
                aria-hidden
              />
              <p className="mb-1 text-sm font-medium text-foreground">
                {EMPTY[filter]}
              </p>
              {canComment && (
                <p className="text-xs text-muted-foreground">
                  Select text, then press Ctrl+Alt+M to comment.
                </p>
              )}
            </div>
          )}
          {anchored.map(renderCard)}
          {detached.length > 0 && (
            <section aria-label="Detached comments" className="space-y-2 pt-3">
              <div className="px-1">
                <h3 className="text-xs font-medium text-foreground">
                  Detached
                </h3>
                <p className="text-xs text-muted-foreground">
                  The text these were on was deleted.
                </p>
              </div>
              {detached.map(renderCard)}
            </section>
          )}
        </div>
      </aside>
    </>
  );
}
