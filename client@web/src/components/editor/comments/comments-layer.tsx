"use client";
import { useStore } from "@nanostores/react";
import type { Document } from "@shared-types";
import type { Editor } from "@tiptap/react";
import { nanoid } from "nanoid";
import { atom, computed } from "nanostores";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useComments } from "@/hooks/use-comments";
import type { DocumentPermissions } from "@/hooks/use-document-permissions";
import { showToast } from "@/lib/toast";
import { $auth } from "@/state/auth";
import { editorActions, editorUIState } from "@/state/editor";
import {
  addCommentMark,
  pendingRange,
  quoteOf,
  removeCommentMark,
  resolveAnchors,
  setCommentView,
} from "../extensions/comment-extension";
import { CommentsPanel } from "./comments-panel";
import { stackCards } from "./layout";
import { mentionCandidates } from "./rich-text";
import { NewCommentCard, type ThreadActions, ThreadCard } from "./thread-card";
import {
  type Anchor,
  type CommentAbilities,
  countThreads,
  matchesFilter,
  orderThreads,
  type Thread,
  type ThreadFilter,
} from "./threads";
import "./comments.css";

/** True while margin cards need the page moved left to fit (the editor pads its right side). */
export const $commentsMargin = atom(false);
/** Margin column: gap from the page, card width, room on the right. Matches the editor's padding. */
export const MARGIN_COLUMN = 344;
const GAP = 24;
const CARD_W = 288;
const STACK_GAP = 8;
const NEW_ID = "__new-comment";

const $composeRequests = atom(0);
/** Opens the composer for the current selection (selection bubble). */
export const requestComment = () =>
  $composeRequests.set($composeRequests.get() + 1);

const $panelOpen = computed(editorUIState, (s) => s.isCommentsSidebarOpen);
const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface CommentsLayerProps {
  editor: Editor | null;
  documentId: string;
  document: Document;
  permissions: DocumentPermissions;
  /** The stored content is in the editor (anchors are meaningless before). */
  ready: boolean;
}

/**
 * Everything comments: highlights in the text, cards in the right margin (wide screens), a bottom
 * sheet (narrow screens), the comments panel, and the new-comment flow. Rendered inside the editor's
 * scroll container so margin cards scroll with the page.
 */
export function CommentsLayer({
  editor,
  documentId,
  document: doc,
  permissions,
  ready,
}: CommentsLayerProps) {
  const user = useStore($auth).user;
  const userId = user?.id ?? "";
  const { threads, isLoading, actions: api } = useComments(documentId);
  const panelOpen = useStore($panelOpen);
  const live = !!editor && !editor.isDestroyed && ready;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [composer, setComposer] = useState<{ quote: string } | null>(null);
  const [filter, setFilter] = useState<ThreadFilter>("open");
  const [docTick, setDocTick] = useState(0);
  const [wide, setWide] = useState(false);
  const [layout, setLayout] = useState<{
    left: number;
    tops: Record<string, number>;
  }>({ left: 0, tops: {} });

  const abilities: CommentAbilities = useMemo(
    () => ({
      userId,
      canComment: permissions.canComment && !!userId,
      isOwner: permissions.accessLevel === "owner",
      canEditDoc: permissions.canEdit,
    }),
    [
      userId,
      permissions.canComment,
      permissions.accessLevel,
      permissions.canEdit,
    ],
  );

  const people = useMemo(
    () =>
      mentionCandidates(
        doc.sharing?.sharedWith ?? [],
        threads.flatMap((t) => [t.author, ...t.replies.map((r) => r.author)]),
        { id: userId, email: user?.email },
      ),
    [doc.sharing?.sharedWith, threads, userId, user?.email],
  );

  // ---------------------------------------------------------------- anchors

  // biome-ignore lint/correctness/useExhaustiveDependencies: docTick marks a document change
  const anchors = useMemo(
    () =>
      live && editor
        ? resolveAnchors(editor.state.doc, threads)
        : new Map<string, Anchor>(),
    [live, editor, threads, docTick],
  );
  const { anchored, detached } = useMemo(
    () => orderThreads(threads, anchors),
    [threads, anchors],
  );
  const openAnchored = useMemo(
    () => anchored.filter((t) => !t.resolved),
    [anchored],
  );

  // Highlights follow the open, anchored threads.
  useEffect(() => {
    if (!live || !editor) return;
    setCommentView(editor.view, {
      anchors: openAnchored.map((t) => ({
        id: t.id,
        ...(anchors.get(t.id) as Anchor),
      })),
      activeId,
      hoveredId,
    });
  }, [live, editor, openAnchored, anchors, activeId, hoveredId]);

  // Threads that arrive after the first load fade in.
  const seen = useRef<Set<string> | null>(null);
  if (seen.current === null && !isLoading)
    seen.current = new Set(threads.map((t) => t.id));
  const arriving = (id: string) => !!seen.current && !seen.current.has(id);
  useEffect(() => {
    if (seen.current) for (const t of threads) seen.current.add(t.id);
  }, [threads]);

  // ---------------------------------------------------------------- activation

  const anchorsRef = useRef(anchors);
  anchorsRef.current = anchors;

  /** Focus a thread; from a card or the panel, also bring its text into view. */
  const activate = useCallback(
    (id: string | null, reveal?: "nearest" | "center") => {
      setActiveId(id);
      const range = id && anchorsRef.current.get(id);
      if (!reveal || !range || !editor || editor.isDestroyed) return;
      const { node } = editor.view.domAtPos(range.from);
      const el = node instanceof Element ? node : node.parentElement;
      el?.scrollIntoView({
        block: reveal,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
      if (reveal === "center" && window.innerWidth < 768)
        editorActions.setCommentsSidebarOpen(false);
    },
    [editor],
  );

  const backToText = useCallback(() => {
    setActiveId(null);
    if (editor && !editor.isDestroyed)
      editor.commands.focus(undefined, { scrollIntoView: false });
  }, [editor]);

  // Clicking highlighted text focuses its thread; clicking other text lets go of it. (Hovering text is
  // plain CSS; hovering a card lights up its text through hoveredId.)
  const composerOpen = useRef(false);
  composerOpen.current = !!composer;
  useEffect(() => {
    if (!live || !editor) return;
    const dom = editor.view.dom;
    const threadAt = (e: Event) =>
      (e.target as Element | null)
        ?.closest?.("[data-thread]")
        ?.getAttribute("data-thread") ?? null;
    const onClick = (e: MouseEvent) => {
      const id = threadAt(e);
      if (id) setActiveId(id);
      else if (!composerOpen.current) setActiveId(null);
    };
    dom.addEventListener("click", onClick);
    return () => dom.removeEventListener("click", onClick);
  }, [live, editor]);

  // ---------------------------------------------------------------- new comment

  const cancelComposer = useCallback(() => {
    setComposer(null);
    if (editor && !editor.isDestroyed) {
      setCommentView(editor.view, { pending: null });
      editor.commands.focus(undefined, { scrollIntoView: false });
    }
  }, [editor]);

  const startComment = useCallback(() => {
    if (!live || !editor) return;
    if (!abilities.canComment) {
      showToast.info("You can't comment on this document");
      return;
    }
    const { from, to, empty } = editor.state.selection;
    const quote = empty ? "" : quoteOf(editor.state.doc, from, to);
    if (!quote.trim()) {
      showToast.info("Select some text to comment on");
      return;
    }
    setCommentView(editor.view, { pending: { from, to } });
    setActiveId(null);
    setComposer({ quote });
  }, [live, editor, abilities.canComment]);

  const startRef = useRef(startComment);
  startRef.current = startComment;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ctrl+Alt+M (Cmd+Option+M); `code` because Option changes the typed character on macOS.
      if (
        (e.ctrlKey || e.metaKey) &&
        e.altKey &&
        !e.shiftKey &&
        e.code === "KeyM"
      ) {
        e.preventDefault();
        startRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    const off = $composeRequests.listen(() => startRef.current());
    return () => {
      document.removeEventListener("keydown", onKey);
      off();
    };
  }, []);

  const submitComment = useCallback(
    async (content: string, mentions: string[]) => {
      if (!editor || editor.isDestroyed) return;
      const range = pendingRange(editor.state);
      if (!range) {
        showToast.error("The selected text was removed");
        cancelComposer();
        return;
      }
      const id = nanoid();
      const quote = quoteOf(editor.state.doc, range.from, range.to);
      // Editors anchor with a mark (moves with the text, syncs to everyone); viewers cannot change
      // the document, so theirs anchor by range and quote.
      const marked =
        permissions.canEdit &&
        editor.isEditable &&
        addCommentMark(editor.view, id, range.from, range.to);
      setCommentView(editor.view, { pending: null });
      setComposer(null);
      // Narrow screens: no sheet popping back up; the thread is a tap on its highlight away.
      setActiveId(wide ? id : null);
      editor
        .chain()
        .focus(undefined, { scrollIntoView: false })
        .setTextSelection(range.to)
        .run();
      const ok = await api.create({ id, content, range, quote, mentions });
      if (!ok) {
        if (marked && !editor.isDestroyed) removeCommentMark(editor.view, id);
        setActiveId((cur) => (cur === id ? null : cur));
        showToast.error(
          "Couldn't post your comment",
          "Check your connection and try again.",
        );
      }
    },
    [editor, permissions.canEdit, api, cancelComposer, wide],
  );

  // ---------------------------------------------------------------- thread actions

  const actions: ThreadActions = useMemo(() => {
    const guard = (p: Promise<boolean>, message: string) =>
      p.then((ok) => {
        if (!ok) showToast.error(message);
        return ok;
      });
    return {
      reply: (id, content) =>
        void guard(
          api.reply(id, content, nanoid()),
          "Couldn't post your reply",
        ),
      edit: (id, content, mentions) =>
        void guard(api.edit(id, content, mentions), "Couldn't save your edit"),
      editReply: (id, replyId, content) =>
        void guard(
          api.editReply(id, replyId, content),
          "Couldn't save your edit",
        ),
      deleteReply: (id, replyId) =>
        void guard(api.deleteReply(id, replyId), "Couldn't delete the reply"),
      setResolved: (id, resolved) => {
        if (resolved) setActiveId((cur) => (cur === id ? null : cur));
        void guard(
          api.setResolved(id, resolved),
          resolved
            ? "Couldn't resolve the thread"
            : "Couldn't reopen the thread",
        );
      },
      remove: (id) => {
        setActiveId((cur) => (cur === id ? null : cur));
        void guard(api.remove(id), "Couldn't delete the thread").then((ok) => {
          if (
            ok &&
            permissions.canEdit &&
            editor &&
            !editor.isDestroyed &&
            editor.isEditable
          )
            removeCommentMark(editor.view, id);
        });
      },
    };
  }, [api, permissions.canEdit, editor]);

  // ---------------------------------------------------------------- margin layout

  const showMargin = wide && !panelOpen;
  const marginThreads = showMargin ? openAnchored : [];
  const columnRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef(new Map<string, HTMLElement>());

  const measure = () => {
    const container = columnRef.current?.parentElement;
    const paper = container?.querySelector<HTMLElement>(".paper-sheet");
    if (!container || !paper || !editor || editor.isDestroyed) return;
    const box = container.getBoundingClientRect();
    const page = paper.getBoundingClientRect();
    // Room for the page, the editor's left padding (32) and the column.
    const fits =
      container.clientWidth >= paper.offsetWidth + 32 + MARGIN_COLUMN;
    setWide(fits);
    const pending = composer ? pendingRange(editor.state) : null;
    const wanted = [
      ...marginThreads.map((t) => ({
        id: t.id,
        from: anchors.get(t.id)?.from,
      })),
      ...(pending ? [{ id: NEW_ID, from: pending.from }] : []),
    ];
    const items = [];
    for (const { id, from } of wanted) {
      if (from === undefined) continue;
      try {
        const top =
          editor.view.coordsAtPos(from).top - box.top + container.scrollTop;
        items.push({
          id,
          top,
          height: cardEls.current.get(id)?.offsetHeight || 96,
        });
      } catch {
        // Position outside the rendered document mid-update; the next pass places it.
      }
    }
    const tops = Object.fromEntries(
      stackCards(items, pending ? NEW_ID : activeId, STACK_GAP),
    );
    const left = Math.round(page.right - box.left + container.scrollLeft + GAP);
    const prev = layoutRef.current;
    const same =
      prev.left === left &&
      Object.keys(tops).length === Object.keys(prev.tops).length &&
      Object.entries(tops).every(([k, v]) => Math.abs(prev.tops[k] - v) < 0.5);
    // Runs after every render: only a real change may cause another one.
    if (!same) setLayout({ left, tops });
    // Move the page left only when the column does not fit beside it centred.
    $commentsMargin.set(
      fits &&
        !panelOpen &&
        items.length > 0 &&
        (container.clientWidth - paper.offsetWidth) / 2 < MARGIN_COLUMN,
    );
  };
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const measureRef = useRef(measure);
  measureRef.current = measure;
  useLayoutEffect(() => measureRef.current());

  const [schedule, observer] = useMemo(() => {
    let frame = 0;
    let docDirty = false;
    const run = (docChanged = false) => {
      docDirty ||= docChanged;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (docDirty) {
          docDirty = false;
          setDocTick((n) => n + 1);
        }
        measureRef.current();
      });
    };
    const ro =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => run());
    return [run, ro] as const;
  }, []);

  useEffect(() => {
    const container = columnRef.current?.parentElement;
    if (container) observer?.observe(container);
    const onTr = ({ transaction }: { transaction: { docChanged: boolean } }) =>
      schedule(transaction.docChanged);
    editor?.on("transaction", onTr);
    return () => {
      editor?.off("transaction", onTr);
      if (container) observer?.unobserve(container);
    };
  }, [editor, observer, schedule]);

  useEffect(
    () => () => {
      observer?.disconnect();
      $commentsMargin.set(false);
    },
    [observer],
  );

  // Stable ref callbacks per card, so cards are observed once.
  const refFns = useRef(new Map<string, (el: HTMLElement | null) => void>());
  const cardRef = (id: string) => {
    let fn = refFns.current.get(id);
    if (!fn) {
      fn = (el) => {
        const prev = cardEls.current.get(id);
        if (prev && observer) observer.unobserve(prev);
        if (el) {
          cardEls.current.set(id, el);
          observer?.observe(el);
        } else {
          cardEls.current.delete(id);
          refFns.current.delete(id);
        }
      };
      refFns.current.set(id, fn);
    }
    return fn;
  };

  // ---------------------------------------------------------------- render

  const renderCard = (t: Thread, opts: { panel?: boolean } = {}) => (
    <ThreadCard
      key={t.id}
      thread={t}
      active={activeId === t.id}
      abilities={abilities}
      people={people}
      actions={actions}
      showQuote={opts.panel}
      arriving={arriving(t.id)}
      onActivate={() => activate(t.id, opts.panel ? "center" : "nearest")}
      onLeave={backToText}
      onHover={(on) => setHoveredId(on ? t.id : null)}
    />
  );

  const newCard = (where: "margin" | "panel" | "sheet") =>
    composer && (
      <NewCommentCard
        key={NEW_ID}
        quote={where === "margin" ? undefined : composer.quote}
        people={people}
        onSubmit={submitComment}
        onCancel={cancelComposer}
        className={where === "sheet" ? "shadow-none" : undefined}
      />
    );

  const counts = useMemo(
    () => countThreads(threads, userId),
    [threads, userId],
  );
  const visible = (list: Thread[]) =>
    list.filter((t) => matchesFilter(t, filter, userId));
  const activeThread = activeId
    ? threads.find((t) => t.id === activeId)
    : undefined;
  const sheetOpen = !wide && !panelOpen && (!!composer || !!activeThread);

  return (
    <>
      <div
        ref={columnRef}
        className="pointer-events-none absolute top-0 z-10"
        style={{ left: layout.left, width: CARD_W }}
      >
        {[...marginThreads, ...(composer && showMargin ? [null] : [])].map(
          (t) => {
            const id = t ? t.id : NEW_ID;
            const top = layout.tops[id];
            return (
              <div
                key={id}
                ref={cardRef(id)}
                className="cmt-slot pointer-events-auto absolute inset-x-0 top-0"
                // Unplaced cards are not shown, so their first placement does not slide in from the top.
                style={
                  top === undefined
                    ? { display: "none" }
                    : { transform: `translateY(${top}px)` }
                }
              >
                {t ? renderCard(t) : newCard("margin")}
              </div>
            );
          },
        )}
      </div>

      <CommentsPanel
        open={panelOpen}
        onClose={() => editorActions.setCommentsSidebarOpen(false)}
        filter={filter}
        onFilter={setFilter}
        counts={counts}
        anchored={visible(anchored)}
        detached={visible(detached)}
        activeId={activeId}
        canComment={abilities.canComment}
        composer={panelOpen && newCard("panel")}
        renderCard={(t) => renderCard(t, { panel: true })}
      />

      <Drawer
        open={sheetOpen}
        modal={!!composer}
        onOpenChange={(open) => {
          if (open) return;
          if (composer) cancelComposer();
          else setActiveId(null);
        }}
      >
        <DrawerContent
          className="border-border bg-card"
          aria-describedby={undefined}
        >
          <DrawerTitle className="sr-only">
            {composer ? "New comment" : "Comment"}
          </DrawerTitle>
          <div className="max-h-[70vh] overflow-y-auto p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            {composer
              ? newCard("sheet")
              : activeThread && (
                  <ThreadCard
                    thread={activeThread}
                    active
                    abilities={abilities}
                    people={people}
                    actions={actions}
                    showQuote
                    className="border-transparent shadow-none"
                    onActivate={() => undefined}
                    onLeave={backToText}
                  />
                )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
