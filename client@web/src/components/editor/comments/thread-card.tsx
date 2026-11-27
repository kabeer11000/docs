"use client";
import { useStore } from "@nanostores/react";
import { Check, MoreHorizontal, RotateCcw } from "lucide-react";
import { atom, onMount } from "nanostores";
import { type CSSProperties, type Ref, useMemo, useState } from "react";
import { UserAvatar } from "@/components/avatar/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { $auth } from "@/state/auth";
import { CommentComposer } from "./comment-composer";
import {
  exactTime,
  type Person,
  parseRichText,
  relativeTime,
} from "./rich-text";
import {
  type CommentAbilities,
  canDeleteItem,
  canEditItem,
  canResolve,
  type Thread,
} from "./threads";

export interface ThreadActions {
  reply: (threadId: string, content: string) => void;
  edit: (threadId: string, content: string, mentions: string[]) => void;
  editReply: (threadId: string, replyId: string, content: string) => void;
  deleteReply: (threadId: string, replyId: string) => void;
  setResolved: (threadId: string, resolved: boolean) => void;
  remove: (threadId: string) => void;
}

/** Ticks once a minute so "5m ago" stays true. */
const $now = atom(Date.now());
onMount($now, () => {
  $now.set(Date.now());
  const t = setInterval(() => $now.set(Date.now()), 60_000);
  return () => clearInterval(t);
});

function Timestamp({ iso, edited }: { iso: string; edited?: boolean }) {
  const now = useStore($now);
  return (
    <time
      dateTime={iso}
      title={exactTime(iso)}
      className="shrink-0 text-xs text-muted-foreground tabular-nums"
    >
      {relativeTime(iso, now)}
      {edited && ", edited"}
    </time>
  );
}

export function CommentBody({ text }: { text: string }) {
  const tokens = useMemo(() => parseRichText(text), [text]);
  return (
    <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.5] text-foreground">
      {tokens.map((t, i) => {
        const key = `${i}-${t.type}`;
        switch (t.type) {
          case "bold":
            return (
              <strong key={key} className="font-semibold">
                {t.text}
              </strong>
            );
          case "italic":
            return <em key={key}>{t.text}</em>;
          case "code":
            return (
              <code
                key={key}
                className="rounded-[4px] bg-muted px-1 py-px font-mono text-[12px]"
              >
                {t.text}
              </code>
            );
          case "link":
            return (
              <a
                key={key}
                href={t.href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-app underline decoration-app/40 underline-offset-2 hover:decoration-app"
              >
                {t.text}
              </a>
            );
          case "mention":
            return (
              <span
                key={key}
                title={t.email}
                className="rounded-[5px] bg-app-soft px-1 font-medium text-app"
              >
                @{t.text}
              </span>
            );
          default:
            return t.text;
        }
      })}
    </p>
  );
}

interface ItemProps {
  author: Thread["author"];
  at: string;
  edited: boolean;
  content: string;
  people: Person[];
  canEdit: boolean;
  canDelete: boolean;
  deleteLabel: string;
  editing: boolean;
  confirming: boolean;
  onEditing: (on: boolean) => void;
  onConfirming: (on: boolean) => void;
  onSave: (content: string, mentions: string[]) => void;
  onDelete: () => void;
  /** Extra header controls (resolve). */
  aside?: React.ReactNode;
}

function CommentItem(p: ItemProps) {
  return (
    <div className="group/item">
      <div className="flex min-h-7 items-center gap-2">
        <UserAvatar
          id={p.author.id}
          name={p.author.name}
          email={p.author.email}
          photoURL={p.author.avatar}
          size="sm"
          decorative
        />
        <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <span className="truncate text-[13px] font-medium text-foreground">
            {p.author.name}
          </span>
          <Timestamp iso={p.at} edited={p.edited} />
        </div>
        {p.aside}
        {(p.canEdit || p.canDelete) && !p.editing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`More actions for ${p.author.name}'s comment`}
                className="size-7 rounded-full text-muted-foreground opacity-0 group-hover/item:opacity-100 group-focus-within/card:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-32">
              {p.canEdit && (
                <DropdownMenuItem onSelect={() => p.onEditing(true)}>
                  Edit
                </DropdownMenuItem>
              )}
              {p.canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => p.onConfirming(true)}
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="mt-1 pl-8">
        {p.editing ? (
          <CommentComposer
            initial={p.content}
            autoFocus
            label="Edit comment"
            placeholder="Edit comment"
            submitLabel="Save"
            people={p.people}
            onSubmit={(content, mentions) => {
              p.onSave(content, mentions);
              p.onEditing(false);
            }}
            onCancel={() => p.onEditing(false)}
          />
        ) : (
          <CommentBody text={p.content} />
        )}
        {p.confirming && (
          <div
            role="alert"
            className="mt-2 flex items-center gap-1 rounded-[10px] bg-destructive/8 py-1 pr-1 pl-2.5"
          >
            <span className="mr-auto text-xs text-foreground">
              {p.deleteLabel}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 rounded-full px-2.5"
              onClick={() => p.onConfirming(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 rounded-full px-2.5"
              autoFocus
              onClick={p.onDelete}
            >
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export interface ThreadCardProps {
  thread: Thread;
  active: boolean;
  abilities: CommentAbilities;
  people: Person[];
  actions: ThreadActions;
  onActivate: () => void;
  /** Esc on the card or in its reply box: leave the thread, back to the text. */
  onLeave: () => void;
  showQuote?: boolean;
  arriving?: boolean;
  className?: string;
  style?: CSSProperties;
  cardRef?: Ref<HTMLElement>;
  onHover?: (on: boolean) => void;
}

const COLLAPSE_AFTER = 2;

/** One thread: the comment, its replies, and (when active) a reply box. */
export function ThreadCard({
  thread: t,
  active,
  abilities: a,
  people,
  actions,
  onActivate,
  onLeave,
  showQuote,
  arriving,
  className,
  style,
  cardRef,
  onHover,
}: ThreadCardProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const hidden = expanded ? 0 : Math.max(0, t.replies.length - COLLAPSE_AFTER);
  const replies = hidden ? t.replies.slice(0, COLLAPSE_AFTER) : t.replies;
  const resolvable = canResolve(a, t);
  const snippet =
    t.content.length > 80 ? `${t.content.slice(0, 80)}...` : t.content;
  const toggle =
    (id: string, set: (v: string | null) => void) => (on: boolean) =>
      set(on ? id : null);

  return (
    <article
      ref={cardRef}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: threads are focusable so keyboard users can move between them
      tabIndex={0}
      data-thread-card={t.id}
      aria-current={active || undefined}
      aria-label={`Comment by ${t.author.name}${t.resolved ? ", resolved" : ""}${t.replies.length ? `, ${t.replies.length} ${t.replies.length === 1 ? "reply" : "replies"}` : ""}: ${snippet}`}
      onClick={(e) => {
        if (
          !(e.target as HTMLElement).closest(
            "button, a, textarea, [role='menuitem'], [role='option']",
          )
        )
          onActivate();
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        } else if (e.key === "Escape") {
          e.preventDefault();
          onLeave();
        }
      }}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      style={style}
      className={cn(
        "group/card cursor-default rounded-[14px] border bg-card p-3 text-left outline-none transition-[box-shadow,border-color,opacity] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-transparent shadow-float"
          : "border-border hover:shadow-card",
        t.resolved && !active && "opacity-80",
        arriving && "cmt-arrive",
        className,
      )}
    >
      {showQuote && t.quote && (
        <p className="mb-2 line-clamp-2 border-l-2 border-highlight pl-2 text-xs text-muted-foreground">
          {t.quote}
        </p>
      )}
      <CommentItem
        author={t.author}
        at={t.timestamp.createdAt}
        edited={!!t.editedAt}
        content={t.content}
        people={people}
        canEdit={canEditItem(a, t.author.id)}
        canDelete={canDeleteItem(a, t.author.id)}
        deleteLabel="Delete this thread?"
        editing={editing === t.id}
        confirming={confirming === t.id}
        onEditing={toggle(t.id, setEditing)}
        onConfirming={toggle(t.id, setConfirming)}
        onSave={(content, mentions) => actions.edit(t.id, content, mentions)}
        onDelete={() => actions.remove(t.id)}
        aside={
          resolvable &&
          !t.resolved && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Resolve thread"
              title="Resolve"
              onClick={() => actions.setResolved(t.id, true)}
              className="size-7 rounded-full text-muted-foreground hover:bg-sheet-soft hover:text-sheet"
            >
              <Check />
            </Button>
          )
        }
      />

      {replies.length > 0 && (
        <ul className="mt-3 space-y-3">
          {replies.map((r) => (
            <li key={r.id}>
              <CommentItem
                author={r.author}
                at={r.timestamp.createdAt}
                edited={!!r.editedAt}
                content={r.content}
                people={people}
                canEdit={canEditItem(a, r.author.id)}
                canDelete={canDeleteItem(a, r.author.id)}
                deleteLabel="Delete this reply?"
                editing={editing === r.id}
                confirming={confirming === r.id}
                onEditing={toggle(r.id, setEditing)}
                onConfirming={toggle(r.id, setConfirming)}
                onSave={(content) => actions.editReply(t.id, r.id, content)}
                onDelete={() => {
                  setConfirming(null);
                  actions.deleteReply(t.id, r.id);
                }}
              />
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 ml-8 rounded-full px-2 py-0.5 text-xs font-medium text-app hover:bg-app-soft"
        >
          Show {hidden} more {hidden === 1 ? "reply" : "replies"}
        </button>
      )}

      {t.resolved && (
        <div className="mt-3 flex items-center gap-2 pl-8 text-xs text-muted-foreground">
          <Check className="size-3.5 text-sheet" aria-hidden />
          <span className="mr-auto">Resolved</span>
          {resolvable && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 rounded-full px-2.5 text-xs"
              onClick={() => actions.setResolved(t.id, false)}
            >
              <RotateCcw className="size-3.5" />
              Reopen
            </Button>
          )}
        </div>
      )}

      {active && a.canComment && !t.resolved && editing === null && (
        <div className="mt-3 pl-8">
          <CommentComposer
            quiet
            label={`Reply to ${t.author.name}`}
            placeholder="Reply"
            submitLabel="Reply"
            people={people}
            onSubmit={(content) => actions.reply(t.id, content)}
            onCancel={onLeave}
          />
        </div>
      )}
    </article>
  );
}

/** The card a new comment is written in, before it exists. */
export function NewCommentCard({
  quote,
  people,
  onSubmit,
  onCancel,
  className,
  cardRef,
}: {
  quote?: string;
  people: Person[];
  onSubmit: (content: string, mentions: string[]) => void;
  onCancel: () => void;
  className?: string;
  cardRef?: Ref<HTMLElement>;
}) {
  const user = useStore($auth).user;
  const name = user?.displayName || user?.email || "You";
  return (
    <section
      ref={cardRef}
      aria-label="New comment"
      className={cn(
        "cmt-arrive rounded-[14px] bg-card p-3 shadow-float",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <UserAvatar
          id={user?.id}
          name={name}
          email={user?.email}
          photoURL={user?.photoURL}
          size="sm"
          decorative
        />
        <span className="truncate text-[13px] font-medium text-foreground">
          {name}
        </span>
      </div>
      {quote && (
        <p className="mb-2 line-clamp-2 border-l-2 border-highlight pl-2 text-xs text-muted-foreground">
          {quote}
        </p>
      )}
      <CommentComposer
        autoFocus
        label="New comment"
        placeholder="Add a comment, @ to mention"
        submitLabel="Comment"
        people={people}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </section>
  );
}
