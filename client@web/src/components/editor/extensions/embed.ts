import { Node } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { toEmbed } from "./embed-url";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    embed: { setEmbed: (url: string) => ReturnType };
  }
}

const IFRAME_ATTRS = {
  sandbox: "allow-scripts allow-same-origin allow-popups allow-presentation",
  allow: "fullscreen; picture-in-picture; encrypted-media",
  allowfullscreen: "true",
  loading: "lazy",
  referrerpolicy: "strict-origin-when-cross-origin",
};

/**
 * An allowlisted iframe (see embed-url). The src is re-checked on parse and render, so stored
 * or pasted HTML cannot smuggle in another address. The link under it is the print/export fallback.
 */
export const Embed = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      provider: { default: "" },
      title: { default: "" },
      aspect: { default: "16/9" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-embed]",
        getAttrs: (el) => {
          const iframe = el.querySelector("iframe");
          const target = toEmbed(iframe?.getAttribute("src") ?? "");
          return target ? { ...target, title: iframe?.getAttribute("title") || target.provider } : false;
        },
      },
    ];
  },

  renderHTML({ node }) {
    const target = toEmbed(node.attrs.src ?? "");
    if (!target) return ["div", { "data-embed": "", class: "embed" }];
    const title = node.attrs.title || target.provider;
    return [
      "div",
      { "data-embed": target.provider, class: "embed", style: `--embed-aspect: ${target.aspect}` },
      ["iframe", { ...IFRAME_ATTRS, src: target.src, title }],
      ["a", { class: "embed-link", href: target.src, target: "_blank", rel: "noopener noreferrer" }, title],
    ];
  },

  addCommands() {
    return {
      setEmbed:
        (url) =>
        ({ commands }) => {
          const target = toEmbed(url);
          return !!target && commands.insertContent({ type: this.name, attrs: { ...target, title: target.provider } });
        },
    };
  },

  addProseMirrorPlugins() {
    const type = this.type;
    return [
      new Plugin({
        key: new PluginKey("embedPaste"),
        props: {
          // A known provider's link pasted alone on an empty line becomes an embed; other links stay links.
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData("text/plain").trim() ?? "";
            const { $from, empty } = view.state.selection;
            if (!text || /\s/.test(text) || !empty || $from.parent.type.name !== "paragraph" || $from.parent.content.size) return false;
            const target = toEmbed(text);
            const index = $from.index(-1);
            if (!target || !$from.node(-1).canReplaceWith(index, index + 1, type)) return false;
            view.dispatch(view.state.tr.replaceWith($from.before(), $from.after(), type.create({ ...target, title: target.provider })));
            return true;
          },
        },
      }),
    ];
  },
});
