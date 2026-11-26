import { mergeAttributes, Node } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: { setPageBreak: () => ReturnType };
  }
}

/** Manual page break. Pagination starts a new page after it; print/HTML use break-after. */
export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: "div[data-page-break]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-page-break": "true", class: "page-break" })];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ commands }) =>
          commands.insertContent([{ type: this.name }, { type: "paragraph" }]),
    };
  },

  addKeyboardShortcuts() {
    return { "Mod-Enter": () => this.editor.commands.setPageBreak() };
  },
});
