import CodeBlockBase from "@tiptap/extension-code-block";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import type { createLowlight } from "lowlight";

// Syntax colours are decorations only (saved HTML stays plain `<pre><code class="language-x">`).
// lowlight and its grammars load the first time a document shows a code block; until then the
// code renders plain, and every open editor is refreshed once they arrive.

type Lowlight = ReturnType<typeof createLowlight>;
type HastNode = { type: string; value?: string; properties?: { className?: string[] }; children?: HastNode[] };

let lowlight: Lowlight | null = null;
let loading: Promise<void> | null = null;
const views = new Set<EditorView>();
const key = new PluginKey<{ set: DecorationSet; blocks: PMNode[] }>("codeHighlight");
// Highlight runs per block node; unchanged blocks keep their node object, so this skips them.
const cache = new WeakMap<PMNode, { from: number; to: number; cls: string }[]>();

function load() {
  loading ??= import("lowlight").then(({ common, createLowlight }) => {
    lowlight = createLowlight(common);
    for (const view of views) {
      if (!view.isDestroyed) view.dispatch(view.state.tr.setMeta(key, true).setMeta("addToHistory", false));
    }
  });
  return loading;
}

function codeBlocks(doc: PMNode, name: string) {
  const found: { node: PMNode; pos: number }[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === name) found.push({ node, pos });
    return !node.isTextblock;
  });
  return found;
}

function spans(node: PMNode, ll: Lowlight) {
  let out = cache.get(node);
  if (out) return out;
  const language: string | null = node.attrs.language;
  const text = node.textContent;
  const tree = language && ll.registered(language) ? ll.highlight(language, text) : ll.highlightAuto(text);
  out = [];
  let at = 0;
  const walk = (nodes: HastNode[], classes: string[]) => {
    for (const n of nodes) {
      if (n.type === "text") {
        const len = n.value?.length ?? 0;
        if (classes.length && len) out?.push({ from: at, to: at + len, cls: classes.join(" ") });
        at += len;
      } else if (n.children) walk(n.children, [...classes, ...(n.properties?.className ?? [])]);
    }
  };
  walk(tree.children as HastNode[], []);
  cache.set(node, out);
  return out;
}

function build(doc: PMNode, blocks: { node: PMNode; pos: number }[], ll = lowlight) {
  if (!ll || !blocks.length) return DecorationSet.empty;
  const decos: Decoration[] = [];
  for (const { node, pos } of blocks) {
    for (const s of spans(node, ll)) decos.push(Decoration.inline(pos + 1 + s.from, pos + 1 + s.to, { class: s.cls }));
  }
  return DecorationSet.create(doc, decos);
}

/** Highlight decorations for every code block in `doc` (exported for tests). */
export const highlightDoc = (doc: PMNode, name: string, ll: Lowlight) => build(doc, codeBlocks(doc, name), ll);

export const CodeBlock = CodeBlockBase.extend({
  addProseMirrorPlugins() {
    const name = this.name;
    return [
      ...(this.parent?.() ?? []),
      new Plugin({
        key,
        state: {
          init: (_, { doc }) => {
            const found = codeBlocks(doc, name);
            return { set: build(doc, found), blocks: found.map((b) => b.node) };
          },
          apply(tr, prev) {
            if (!tr.docChanged && !tr.getMeta(key)) return prev;
            const found = codeBlocks(tr.doc, name);
            const blocks = found.map((b) => b.node);
            const same = !tr.getMeta(key) && blocks.length === prev.blocks.length && blocks.every((b, i) => b === prev.blocks[i]);
            return { set: same ? prev.set.map(tr.mapping, tr.doc) : build(tr.doc, found), blocks };
          },
        },
        props: {
          decorations: (state) => key.getState(state)?.set,
        },
        view(view) {
          views.add(view);
          const check = () => {
            if (!lowlight && key.getState(view.state)?.blocks.length) void load();
          };
          check();
          return {
            update: check,
            destroy: () => views.delete(view),
          };
        },
      }),
    ];
  },
}).configure({ defaultLanguage: null });
