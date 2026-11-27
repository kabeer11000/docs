import { type Editor, InputRule, mergeAttributes, Node, type NodeViewRenderer } from "@tiptap/core";
// Types only: the command declarations (insertInlineMath, ...). The package itself imports KaTeX
// eagerly, so the nodes are defined here and KaTeX loads the first time an equation is shown.
import type {} from "@tiptap/extension-mathematics";
import type { KatexOptions } from "katex";
import { askInline } from "./inline-prompt";

type Katex = typeof import("katex").default;
let katexLoad: Promise<Katex> | null = null;
const loadKatex = () => {
  katexLoad ??= Promise.all([
    import("katex"),
    // @ts-expect-error a stylesheet import has no type declarations
    import("katex/dist/katex.min.css"),
  ]).then(([m]) => m.default);
  return katexLoad;
};

export const askLatex = (editor: Editor, value?: string, pos?: number) =>
  askInline(editor, { label: "Equation (LaTeX)", placeholder: "E = mc^2", value, pos });

/** Shows the LaTeX source until KaTeX is loaded, then the rendered equation. Click to edit; clearing removes it. */
function mathView(kind: "inline" | "block", options: KatexOptions): NodeViewRenderer {
  return ({ node, editor, getPos }) => {
    const dom: HTMLElement = document.createElement(kind === "inline" ? "span" : "div");
    dom.className = "tiptap-mathematics-render math-pending";
    if (editor.isEditable) dom.classList.add("tiptap-mathematics-render--editable");
    dom.dataset.type = `${kind}-math`;
    dom.setAttribute("data-latex", node.attrs.latex);
    let target: HTMLElement = dom;
    if (kind === "block") {
      target = document.createElement("div");
      target.className = "block-math-inner";
      dom.appendChild(target);
    }
    target.textContent = node.attrs.latex;

    let alive = true;
    loadKatex().then(
      (katex) => {
        if (!alive) return;
        dom.classList.remove("math-pending");
        try {
          katex.render(node.attrs.latex, target, options);
        } catch {
          target.textContent = node.attrs.latex;
          dom.classList.add(`${kind}-math-error`);
        }
      },
      () => {},
    );

    const onClick = async (event: MouseEvent) => {
      const pos = typeof getPos === "function" ? getPos() : undefined;
      if (!editor.isEditable || pos == null) return;
      event.preventDefault();
      const latex = await askLatex(editor, node.attrs.latex, pos);
      if (latex === null) return;
      const chain = editor.chain().focus();
      if (kind === "inline") (latex ? chain.updateInlineMath({ latex, pos }) : chain.deleteInlineMath({ pos })).run();
      else (latex ? chain.updateBlockMath({ latex, pos }) : chain.deleteBlockMath({ pos })).run();
    };
    dom.addEventListener("click", onClick);

    return {
      dom,
      destroy() {
        alive = false;
        dom.removeEventListener("click", onClick);
      },
    };
  };
}

const latexAttribute = {
  latex: {
    default: "",
    parseHTML: (element: HTMLElement) => element.getAttribute("data-latex"),
    renderHTML: (attributes: Record<string, unknown>) => ({ "data-latex": attributes.latex }),
  },
};

/** Inline `$x^2$`. Same schema and commands as @tiptap/extension-mathematics. */
export const InlineMath = Node.create({
  name: "inlineMath",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes: () => latexAttribute,

  addCommands() {
    return {
      insertInlineMath:
        ({ latex, pos }) =>
        ({ editor, tr }) => {
          if (!latex) return false;
          const from = pos ?? editor.state.selection.from;
          tr.replaceWith(from, from, this.type.create({ latex }));
          return true;
        },
      deleteInlineMath:
        (options) =>
        ({ editor, tr }) => {
          const pos = options?.pos ?? editor.state.selection.$from.pos;
          const node = editor.state.doc.nodeAt(pos);
          if (!node || node.type.name !== this.name) return false;
          tr.delete(pos, pos + node.nodeSize);
          return true;
        },
      updateInlineMath:
        (options) =>
        ({ editor, tr }) => {
          const pos = options?.pos ?? editor.state.selection.$from.pos;
          const node = editor.state.doc.nodeAt(pos);
          if (!node || node.type.name !== this.name) return false;
          tr.setNodeMarkup(pos, this.type, { ...node.attrs, latex: options?.latex });
          return true;
        },
    };
  },

  parseHTML: () => [{ tag: 'span[data-type="inline-math"]' }],
  renderHTML: ({ HTMLAttributes }) => ["span", mergeAttributes(HTMLAttributes, { "data-type": "inline-math" })],

  addInputRules() {
    return [
      new InputRule({
        find: /(^|[^$\w])\$([^\s$](?:[^$\n]*?[^\s$])?)\$$/,
        handler: ({ state, range, match }) => {
          state.tr.replaceWith(range.from + match[1].length, range.to, this.type.create({ latex: match[2] }));
        },
      }),
    ];
  },

  addNodeView: () => mathView("inline", { throwOnError: false }),
});

/** Display `$$...$$` on its own line. */
export const BlockMath = Node.create({
  name: "blockMath",
  group: "block",
  atom: true,

  addAttributes: () => latexAttribute,

  addCommands() {
    return {
      insertBlockMath:
        ({ latex, pos }) =>
        ({ commands, editor }) => {
          if (!latex) return false;
          return commands.insertContentAt(pos ?? editor.state.selection.from, { type: this.name, attrs: { latex } });
        },
      deleteBlockMath:
        (options) =>
        ({ editor, tr }) => {
          const pos = options?.pos ?? editor.state.selection.$from.pos;
          const node = editor.state.doc.nodeAt(pos);
          if (!node || node.type.name !== this.name) return false;
          tr.delete(pos, pos + node.nodeSize);
          return true;
        },
      updateBlockMath:
        (options) =>
        ({ editor, tr }) => {
          const pos = options?.pos ?? editor.state.selection.$from.pos;
          const node = editor.state.doc.nodeAt(pos);
          if (!node || node.type.name !== this.name) return false;
          tr.setNodeMarkup(pos, this.type, { ...node.attrs, latex: options?.latex || node.attrs.latex });
          return true;
        },
    };
  },

  parseHTML: () => [{ tag: 'div[data-type="block-math"]' }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-type": "block-math" })],

  addInputRules() {
    return [
      new InputRule({
        find: /^\$\$([^$]+)\$\$$/,
        handler: ({ state, range, match }) => {
          state.tr.replaceRangeWith(range.from, range.to, this.type.create({ latex: match[1].trim() }));
        },
      }),
    ];
  },

  addNodeView: () => mathView("block", { throwOnError: false, displayMode: true }),
});
