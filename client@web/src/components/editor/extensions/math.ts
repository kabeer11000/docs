import { type Editor, InputRule, type NodeViewRenderer } from "@tiptap/core";
import { BlockMath as BaseBlockMath, InlineMath as BaseInlineMath } from "@tiptap/extension-mathematics";
import { askInline } from "./inline-prompt";
import "katex/dist/katex.min.css";

const katexOptions = { throwOnError: false };

export const askLatex = (editor: Editor, value?: string, pos?: number) =>
  askInline(editor, { label: "Equation (LaTeX)", placeholder: "E = mc^2", value, pos });

/** Click an equation to edit its LaTeX; clearing it removes the equation. */
function withEditOnClick(parent: NodeViewRenderer | null | undefined, kind: "inline" | "block"): NodeViewRenderer | null {
  if (!parent) return null;
  return (props) => {
    const view = parent(props);
    view.dom.addEventListener("click", async (event) => {
      const { editor, node } = props;
      const pos = typeof props.getPos === "function" ? props.getPos() : undefined;
      if (!editor.isEditable || pos == null) return;
      event.preventDefault();
      const latex = await askLatex(editor, node.attrs.latex, pos);
      if (latex === null) return;
      const chain = editor.chain().focus();
      if (kind === "inline") (latex ? chain.updateInlineMath({ latex, pos }) : chain.deleteInlineMath({ pos })).run();
      else (latex ? chain.updateBlockMath({ latex, pos }) : chain.deleteBlockMath({ pos })).run();
    });
    return view;
  };
}

/** Inline `$x^2$`. */
export const InlineMath = BaseInlineMath.extend({
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
  addNodeView() {
    return withEditOnClick(this.parent?.(), "inline");
  },
}).configure({ katexOptions });

/** Display `$$...$$` on its own line. */
export const BlockMath = BaseBlockMath.extend({
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
  addNodeView() {
    return withEditOnClick(this.parent?.(), "block");
  },
}).configure({ katexOptions: { ...katexOptions, displayMode: true } });
