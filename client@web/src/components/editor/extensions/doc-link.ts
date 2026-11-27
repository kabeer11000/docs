import { Node } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";
import { nanoid } from "nanoid";
import { hrefForId } from "@/lib/files";
import { showToast } from "@/lib/toast";
import { $documents } from "@/state/cloudstore-data";
import { docLinkActions, liveTitle } from "../links/actions";
import { type DocLinkItem, DocLinkMenu } from "../links/doc-link-menu";
import { rankFiles } from "../links/links";
import { popupRenderer } from "./slash-command";

function suggest(query: string): DocLinkItem[] {
  const files = $documents.get().filter((d) => d.id !== docLinkActions.currentId);
  const items: DocLinkItem[] = rankFiles(files, query).map((file) => ({ type: "file", file }));
  const title = query.trim();
  if (title && !items.some((i) => i.type === "file" && i.file.title.toLowerCase() === title.toLowerCase())) {
    items.push({ type: "create", title });
  }
  return items;
}

/** Inline link to another file, typed as [[title. Serialized as <a data-doc-link="id" href="/document/id">Title</a>. */
export const DocLink = Node.create({
  name: "docLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: { default: "", rendered: false },
      title: { default: "", rendered: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a[data-doc-link]",
        priority: 100,
        getAttrs: (el) => ({ id: el.getAttribute("data-doc-link") ?? "", title: el.textContent ?? "" }),
      },
    ];
  },

  renderHTML({ node }) {
    const { id, title } = node.attrs;
    return ["a", { "data-doc-link": id, href: hrefForId(id) }, liveTitle(id, title)];
  },

  renderText: ({ node }) => liveTitle(node.attrs.id, node.attrs.title),

  addNodeView() {
    return ({ node }) => {
      const { id, title } = node.attrs;
      const dom = document.createElement("a");
      dom.setAttribute("data-doc-link", id);
      dom.className = "cursor-pointer rounded-[3px] px-0.5 transition-colors duration-150 hover:bg-accent";
      const sync = () => {
        dom.textContent = liveTitle(id, title) || "Untitled";
        dom.href = hrefForId(id);
      };
      const unlisten = $documents.listen(sync);
      sync();
      dom.addEventListener("click", (e) => {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) window.open(dom.href, "_blank", "noopener");
        else docLinkActions.navigate(hrefForId(id));
      });
      return { dom, destroy: unlisten };
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<DocLinkItem>({
        editor: this.editor,
        pluginKey: new PluginKey("docLink"),
        char: "[[",
        allowSpaces: true,
        allowedPrefixes: null,
        items: ({ query }) => suggest(query),
        allow: ({ state, range }) => !state.doc.resolve(range.from).parent.type.spec.code,
        command: ({ editor, range, props }) => {
          const attrs =
            props.type === "file" ? { id: props.file.id, title: props.file.title } : { id: nanoid(), title: props.title };
          editor
            .chain()
            .focus()
            .insertContentAt(range, [{ type: this.name, attrs }, { type: "text", text: " " }])
            .run();
          if (props.type === "create") {
            void docLinkActions.create(attrs).then((ok) => {
              if (!ok) showToast.error(`Could not create "${attrs.title}"`);
            });
          }
        },
        render: () => popupRenderer(DocLinkMenu),
      }),
    ];
  },
});
