import { Extension, type Editor } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { type FindOptions, findMatches, type Match } from "./find-matches";

export interface FindState extends FindOptions {
  query: string;
  matches: Match[];
  index: number;
  decorations: DecorationSet;
}

type FindMeta = Partial<Pick<FindState, "query" | "caseSensitive" | "wholeWord" | "index">>;

export const findKey = new PluginKey<FindState>("find");

const MATCH_STYLE = "background-color: color-mix(in srgb, var(--highlight) 45%, transparent); border-radius: 1px";
const CURRENT_STYLE = "background-color: var(--highlight); color: var(--highlight-foreground); border-radius: 1px";

function build(state: EditorState, prev: FindState, meta: FindMeta | undefined, docChanged: boolean): FindState {
  const next = { ...prev, ...meta };
  const matches =
    docChanged || meta?.query !== undefined || meta?.caseSensitive !== undefined || meta?.wholeWord !== undefined
      ? findMatches(state.doc, next.query, next)
      : prev.matches;
  const index = matches.length ? Math.min(Math.max(next.index, 0), matches.length - 1) : 0;
  const decorations = DecorationSet.create(
    state.doc,
    matches.map((m, i) =>
      Decoration.inline(m.from, m.to, {
        class: i === index ? "find-match find-match-current" : "find-match",
        style: i === index ? CURRENT_STYLE : MATCH_STYLE,
      }),
    ),
  );
  return { ...next, matches, index, decorations };
}

/** Paints search matches as decorations; the document itself is never touched by searching. */
export const Find = Extension.create({
  name: "find",
  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findKey,
        state: {
          init: () => ({
            query: "",
            caseSensitive: false,
            wholeWord: false,
            matches: [],
            index: 0,
            decorations: DecorationSet.empty,
          }),
          apply(tr, prev, _old, state) {
            const meta = tr.getMeta(findKey) as FindMeta | undefined;
            if (!meta && !tr.docChanged) return prev;
            if (!meta && !prev.query) return prev;
            return build(state, prev, meta, tr.docChanged);
          },
        },
        props: { decorations: (state) => findKey.getState(state)?.decorations },
      }),
    ];
  },
});

export const getFind = (editor: Editor) => findKey.getState(editor.state);

export function setFind(editor: Editor, meta: FindMeta) {
  editor.view.dispatch(editor.state.tr.setMeta(findKey, meta).setMeta("addToHistory", false));
}

export function stepFind(editor: Editor, dir: 1 | -1) {
  const s = getFind(editor);
  if (!s?.matches.length) return;
  setFind(editor, { index: (s.index + dir + s.matches.length) % s.matches.length });
}

export function replaceCurrent(editor: Editor, text: string) {
  const s = getFind(editor);
  const m = s?.matches[s.index];
  if (!m || !editor.isEditable) return;
  editor.view.dispatch(editor.state.tr.insertText(text, m.from, m.to));
  // Move past the inserted text, which may itself contain the query.
  const after = m.from + text.length;
  const next = getFind(editor)?.matches.findIndex((x) => x.from >= after) ?? -1;
  setFind(editor, { index: Math.max(next, 0) });
}

export function replaceAll(editor: Editor, text: string) {
  const s = getFind(editor);
  if (!s?.matches.length || !editor.isEditable) return;
  const tr = editor.state.tr;
  for (const m of [...s.matches].reverse()) tr.insertText(text, m.from, m.to);
  editor.view.dispatch(tr);
}
