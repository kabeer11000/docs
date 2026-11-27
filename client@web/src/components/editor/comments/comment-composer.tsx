"use client";
import {
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { UserAvatar } from "@/components/avatar/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  decodeMentions,
  encodeMentions,
  matchPeople,
  mentionQuery,
  type Person,
} from "./rich-text";

export interface CommentComposerProps {
  /** Stored text to start from (editing). */
  initial?: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  people: Person[];
  autoFocus?: boolean;
  /** Reply boxes: buttons appear once something is typed. */
  quiet?: boolean;
  onSubmit: (content: string, mentions: string[]) => void;
  onCancel: () => void;
}

/** Plain textarea with @mention autocomplete. Enter posts, Shift+Enter breaks the line, Esc cancels. */
export function CommentComposer({
  initial,
  label,
  placeholder,
  submitLabel,
  people,
  autoFocus,
  quiet,
  onSubmit,
  onCancel,
}: CommentComposerProps) {
  const start = useMemo(() => decodeMentions(initial ?? ""), [initial]);
  const [text, setText] = useState(start.text);
  const [picked, setPicked] = useState<Person[]>(start.picked);
  const [caret, setCaret] = useState(start.text.length);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!autoFocus) return;
    // A frame later: margin cards are hidden until placed. No scroll jump, the card sits by its text.
    const frame = requestAnimationFrame(() => {
      const el = ref.current;
      el?.focus({ preventScroll: true });
      el?.setSelectionRange(el.value.length, el.value.length);
    });
    return () => cancelAnimationFrame(frame);
  }, [autoFocus]);

  const query = mentionQuery(text.slice(0, caret));
  const matches =
    query && query.start !== dismissedAt
      ? matchPeople(people, query.query)
      : [];
  const open = matches.length > 0;
  const active = Math.min(index, matches.length - 1);

  const pick = (p: Person) => {
    if (!query) return;
    const insert = `@${p.name} `;
    const next = text.slice(0, query.start) + insert + text.slice(caret);
    const pos = query.start + insert.length;
    setText(next);
    setPicked((prev) =>
      prev.some((x) => x.email === p.email) ? prev : [...prev, p],
    );
    setCaret(pos);
    setIndex(0);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(pos, pos);
    });
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const { content, mentions } = encodeMentions(trimmed, picked);
    onSubmit(content, mentions);
    setText("");
    setPicked([]);
    setCaret(0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (open && query) {
      const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
      if (step) {
        e.preventDefault();
        setIndex((active + step + matches.length) % matches.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pick(matches[active]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setDismissedAt(query.start);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    }
  };

  const showButtons = !quiet || text.trim().length > 0;

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={text}
        rows={1}
        placeholder={placeholder}
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setText(e.target.value);
          setCaret(e.target.selectionStart);
        }}
        onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
        onKeyDown={onKeyDown}
        className="max-h-48 min-h-9 resize-none rounded-[10px] px-3 py-2 text-[13px] leading-[1.45] shadow-none md:text-[13px]"
      />
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label="People with access"
          className="studio-pop absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-[12px] border border-border bg-popover p-1 shadow-float"
        >
          {matches.map((p, i) => (
            <div
              key={p.email}
              id={`${listId}-${i}`}
              role="option"
              tabIndex={-1}
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              onMouseEnter={() => setIndex(i)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-1.5 text-[13px]",
                i === active && "bg-accent",
              )}
            >
              <UserAvatar
                id={p.id}
                name={p.name}
                email={p.email}
                size="xs"
                decorative
              />
              <span className="truncate font-medium text-foreground">
                {p.name}
              </span>
              <span className="ml-auto truncate text-xs text-muted-foreground">
                {p.email}
              </span>
            </div>
          ))}
        </div>
      )}
      {showButtons && (
        <div className="mt-2 flex items-center justify-end gap-1">
          {!quiet && (
            <span className="mr-auto text-[11px] text-muted-foreground">
              Enter to send
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 rounded-full px-3"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="app"
            className="h-7 rounded-full px-3"
            disabled={!text.trim()}
            onClick={submit}
          >
            {submitLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
