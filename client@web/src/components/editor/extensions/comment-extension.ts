import { Mark } from "@tiptap/core";
import {
  Fragment,
  type MarkType,
  type Node as PMNode,
  Slice,
} from "@tiptap/pm/model";
import { type EditorState, Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { findQuote, type TextSegment } from "../comments/layout";
import type { Anchor, Thread } from "../comments/threads";

/**
 * Comments are anchored by a `comment` mark carrying the thread id, so ranges move with the text and
 * travel through the live room and the saved HTML (`<span data-comment-id>`). The mark itself draws
 * nothing; the highlight is a decoration so resolved threads can hide and the active one can glow.
 */

export interface AnchorView {
  anchors: { id: string; from: number; to: number }[];
  activeId: string | null;
  hoveredId: string | null;
}
type PluginState = AnchorView & {
  pending: Anchor | null;
  decorations: DecorationSet;
};
type Meta = Partial<AnchorView> & { pending?: Anchor | null };

export const commentAnchorsKey = new PluginKey<PluginState>("commentAnchors");

function build(doc: PMNode, s: AnchorView, pending: Anchor | null) {
  const size = doc.content.size;
  const valid = (r: Anchor) => r.from >= 0 && r.to <= size && r.from < r.to;
  const decos = s.anchors.filter(valid).map((a) =>
    Decoration.inline(a.from, a.to, {
      class: `cmt-anchor${a.id === s.activeId ? " is-active" : ""}${a.id === s.hoveredId ? " is-hover" : ""}`,
      "data-thread": a.id,
    }),
  );
  if (pending && valid(pending))
    decos.push(
      Decoration.inline(pending.from, pending.to, {
        class: "cmt-anchor is-active",
      }),
    );
  return DecorationSet.create(doc, decos);
}

const stripCommentMarks = (frag: Fragment, type: MarkType): Fragment => {
  const nodes: PMNode[] = [];
  frag.forEach((n) => {
    nodes.push(
      n.isText
        ? n.mark(type.removeFromSet(n.marks))
        : n.copy(stripCommentMarks(n.content, type)),
    );
  });
  return Fragment.from(nodes);
};

export const CommentMark = Mark.create({
  name: "comment",
  inclusive: false,
  // Overlapping threads: several comment marks (different ids) on the same text.
  excludes: "",

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-comment-id"),
        renderHTML: (attrs) =>
          attrs.commentId ? { "data-comment-id": attrs.commentId } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-comment-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },

  addProseMirrorPlugins() {
    const type = this.type;
    return [
      new Plugin<PluginState>({
        key: commentAnchorsKey,
        state: {
          init: () => ({
            anchors: [],
            activeId: null,
            hoveredId: null,
            pending: null,
            decorations: DecorationSet.empty,
          }),
          apply(tr, prev, _old, next) {
            const meta = tr.getMeta(commentAnchorsKey) as Meta | undefined;
            if (!meta && !tr.docChanged) return prev;
            let pending = prev.pending;
            if (pending && tr.docChanged) {
              const from = tr.mapping.map(pending.from, 1);
              const to = tr.mapping.map(pending.to, -1);
              pending = from < to ? { from, to } : null;
            }
            if (!meta)
              return {
                ...prev,
                pending,
                decorations: prev.decorations.map(tr.mapping, tr.doc),
              };
            const view: AnchorView = {
              anchors: meta.anchors ?? prev.anchors,
              activeId:
                meta.activeId !== undefined ? meta.activeId : prev.activeId,
              hoveredId:
                meta.hoveredId !== undefined ? meta.hoveredId : prev.hoveredId,
            };
            if (meta.pending !== undefined) pending = meta.pending;
            return {
              ...view,
              pending,
              decorations: build(next.doc, view, pending),
            };
          },
        },
        props: {
          decorations: (state) =>
            commentAnchorsKey.getState(state)?.decorations,
          // A pasted copy would give one thread two ranges; the copy drops the comment instead.
          transformPasted: (slice) =>
            new Slice(
              stripCommentMarks(slice.content, type),
              slice.openStart,
              slice.openEnd,
            ),
        },
      }),
    ];
  },
});

/** Updates what the highlights show; never touches the document or undo history. */
export function setCommentView(view: EditorView, meta: Meta) {
  view.dispatch(
    view.state.tr
      .setMeta(commentAnchorsKey, meta)
      .setMeta("addToHistory", false),
  );
}

/** The selection a new comment is being written for, mapped through edits made meanwhile. */
export const pendingRange = (state: EditorState) =>
  commentAnchorsKey.getState(state)?.pending ?? null;

export const quoteOf = (doc: PMNode, from: number, to: number) =>
  doc.textBetween(from, to, "", () => "");

export function addCommentMark(
  view: EditorView,
  id: string,
  from: number,
  to: number,
) {
  const type = view.state.schema.marks.comment;
  if (!type) return false;
  view.dispatch(
    view.state.tr
      .addMark(from, to, type.create({ commentId: id }))
      .setMeta("addToHistory", false),
  );
  return true;
}

export function removeCommentMark(view: EditorView, id: string) {
  const type = view.state.schema.marks.comment;
  const range = type && commentMarkRanges(view.state.doc).get(id);
  if (!range) return;
  view.dispatch(
    view.state.tr
      .removeMark(range.from, range.to, type.create({ commentId: id }))
      .setMeta("addToHistory", false),
  );
}

/** Where each thread's mark is: from its first to its last marked character. */
export function commentMarkRanges(doc: PMNode): Map<string, Anchor> {
  const out = new Map<string, Anchor>();
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    for (const m of node.marks) {
      if (m.type.name !== "comment" || !m.attrs.commentId) continue;
      const r = out.get(m.attrs.commentId);
      const end = pos + node.nodeSize;
      out.set(
        m.attrs.commentId,
        r
          ? { from: Math.min(r.from, pos), to: Math.max(r.to, end) }
          : { from: pos, to: end },
      );
    }
  });
  return out;
}

function textSegments(doc: PMNode): TextSegment[] {
  const out: TextSegment[] = [];
  doc.descendants((node, pos) => {
    if (node.isText && node.text) out.push({ pos, text: node.text });
  });
  return out;
}

/**
 * Where each thread is in the document now: its mark; else its quoted text (nearest to where it
 * was); else, for threads older than quotes, its stored range. Threads missing here are detached.
 */
export function resolveAnchors(
  doc: PMNode,
  threads: Thread[],
): Map<string, Anchor> {
  const marks = commentMarkRanges(doc);
  const out = new Map<string, Anchor>();
  const size = doc.content.size;
  let segments: TextSegment[] | null = null;
  for (const t of threads) {
    const mark = marks.get(t.id);
    if (mark) {
      out.set(t.id, mark);
      continue;
    }
    const { from, to } = t.range ?? { from: 0, to: 0 };
    const inDoc = from >= 0 && to <= size && from < to;
    if (!t.quote) {
      if (inDoc) out.set(t.id, { from, to });
      continue;
    }
    if (inDoc && quoteOf(doc, from, to) === t.quote) {
      out.set(t.id, { from, to });
      continue;
    }
    // ponytail: full-text scan per mark-less thread on each change; index the text if docs get huge.
    segments ??= textSegments(doc);
    const found = findQuote(segments, t.quote, from);
    if (found) out.set(t.id, found);
  }
  return out;
}
