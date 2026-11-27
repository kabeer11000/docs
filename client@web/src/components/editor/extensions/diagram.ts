import { type Editor, Node } from "@tiptap/core";
import type { Mermaid } from "mermaid";
import { diagramSvgs } from "@/lib/export/diagram-cache";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    diagram: { insertDiagram: (source?: string) => ReturnType };
  }
}

const DEFAULT_SOURCE = "flowchart LR\n  A[Draft] --> B[Review] --> C[Publish]";

let mermaid: Promise<Mermaid> | null = null;
let seq = 0;

// Neutral (greyscale) theme; dark mode inverts it in CSS, so one SVG serves screen, print and export.
async function render(source: string): Promise<{ svg: string } | { error: string }> {
  mermaid ??= import("mermaid").then(({ default: m }) => {
    m.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral", fontFamily: "'Schibsted Grotesk', ui-sans-serif, system-ui, sans-serif" });
    return m;
  });
  const m = await mermaid;
  const id = `diagram-${++seq}`;
  try {
    return { svg: (await m.render(id, source)).svg };
  } catch (e) {
    document.getElementById(id)?.remove();
    document.getElementById(`d${id}`)?.remove();
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** Open the source editor of the diagram at `pos`. */
export function editDiagram(editor: Editor, pos: number) {
  (editor.view.nodeDOM(pos) as HTMLElement | null)?.querySelector<HTMLElement>(".diagram-preview")?.click();
}

/** Mermaid diagram: SVG preview, click to edit the source underneath. Renders once on screen. */
export const Diagram = Node.create({
  name: "diagram",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return { source: { default: DEFAULT_SOURCE } };
  },

  parseHTML() {
    return [
      { tag: "div[data-diagram]", getAttrs: (el) => ({ source: el.textContent ?? "" }) },
      // Markdown ```mermaid fences arrive as code blocks.
      {
        tag: "pre",
        priority: 60,
        getAttrs: (el) => (el.querySelector("code.language-mermaid") ? { source: el.textContent ?? "" } : false),
      },
    ];
  },

  renderHTML({ node }) {
    return ["div", { "data-diagram": "", class: "diagram" }, ["pre", ["code", { class: "language-mermaid" }, node.attrs.source]]];
  },

  addCommands() {
    return {
      insertDiagram:
        (source = DEFAULT_SOURCE) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { source } }),
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current = node;
      let drawn: string | null = null;
      let onScreen = false;
      let timer = 0;

      const dom = document.createElement("div");
      dom.className = "diagram";
      dom.dataset.diagram = "";
      const preview = document.createElement("div");
      preview.className = "diagram-preview";
      preview.textContent = current.attrs.source;
      const error = document.createElement("div");
      error.className = "diagram-error";
      const source = document.createElement("textarea");
      source.className = "diagram-source";
      source.spellcheck = false;
      source.hidden = true;
      source.setAttribute("aria-label", "Diagram source");
      dom.append(preview, error, source);

      const draw = async () => {
        const text = current.attrs.source as string;
        if (text === drawn) return;
        drawn = text;
        const result = await render(text);
        if (drawn !== text) return;
        if ("svg" in result) {
          preview.innerHTML = result.svg;
          error.textContent = "";
          diagramSvgs.set(text, result.svg);
        } else {
          error.textContent = result.error;
        }
      };
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        onScreen = true;
        io.disconnect();
        void draw();
      });
      io.observe(dom);

      const fit = () => {
        source.style.height = "auto";
        source.style.height = `${source.scrollHeight}px`;
      };
      const open = () => {
        if (!editor.isEditable) return;
        source.hidden = false;
        source.value = current.attrs.source;
        fit();
        source.focus();
      };
      preview.addEventListener("click", open);
      error.addEventListener("click", open);
      source.addEventListener("input", () => {
        fit();
        const pos = getPos();
        if (typeof pos !== "number") return;
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, source: source.value }));
      });
      source.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        source.hidden = true;
        const pos = getPos();
        if (typeof pos === "number") editor.chain().focus().setNodeSelection(pos).run();
      });
      source.addEventListener("blur", () => {
        source.hidden = true;
      });

      return {
        dom,
        update(next) {
          if (next.type !== current.type) return false;
          current = next;
          if (document.activeElement !== source) source.value = next.attrs.source;
          window.clearTimeout(timer);
          if (onScreen) timer = window.setTimeout(draw, 300);
          return true;
        },
        stopEvent: (e) => e.target === source,
        ignoreMutation: () => true,
        destroy() {
          io.disconnect();
          window.clearTimeout(timer);
        },
      };
    };
  },
});
