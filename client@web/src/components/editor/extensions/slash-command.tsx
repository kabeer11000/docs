"use client";
import { type Editor, Extension, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionOptions, type SuggestionProps } from "@tiptap/suggestion";
import { type ComponentType, forwardRef, type RefAttributes, useEffect, useImperativeHandle, useRef, useState } from "react";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { editDiagram } from "./diagram";
import { insertImages } from "./image-drop";
import { askInline } from "./inline-prompt";
import { askLatex } from "./math";

export interface SlashItem {
  title: string;
  hint: string;
  keywords: string;
  run: (editor: Editor, range: Range) => void;
}

function pickImage(editor: Editor) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) void insertImages(editor, [file]);
  };
  input.click();
}

function linkTo(editor: Editor, raw: string) {
  const href = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  if (!/^(https?|mailto|tel):/i.test(href)) {
    showToast.error("Only web, mail and phone links are allowed");
    return;
  }
  editor.chain().focus().insertContent({ type: "text", text: raw, marks: [{ type: "link", attrs: { href } }] }).insertContent(" ").run();
}

async function insertLink(editor: Editor, range: Range) {
  editor.chain().focus().deleteRange(range).run();
  const raw = await askInline(editor, { label: "Link address", placeholder: "Paste or type a link" });
  if (raw) linkTo(editor, raw);
}

async function insertEmbed(editor: Editor, range: Range) {
  editor.chain().focus().deleteRange(range).run();
  const raw = await askInline(editor, { label: "Embed link", placeholder: "YouTube, Figma, Loom, Spotify, Maps..." });
  if (raw && !editor.chain().focus().setEmbed(raw).run()) linkTo(editor, raw);
}

async function insertMath(editor: Editor, range: Range, block: boolean) {
  editor.chain().focus().deleteRange(range).run();
  const latex = await askLatex(editor);
  if (!latex) return;
  const chain = editor.chain().focus();
  (block ? chain.insertBlockMath({ latex }) : chain.insertInlineMath({ latex })).run();
}

function insertDiagram(editor: Editor, range: Range) {
  const pos = range.from;
  editor.chain().focus().deleteRange(range).insertDiagram().run();
  // The diagram lands at the cursor, or right after the paragraph it split.
  const at = [pos, pos + 1, pos - 1].find((p) => editor.state.doc.nodeAt(p)?.type.name === "diagram");
  if (at != null) requestAnimationFrame(() => editDiagram(editor, at));
}

export const SLASH_ITEMS: SlashItem[] = [
  { title: "Text", hint: "", keywords: "paragraph plain", run: (e, r) => e.chain().focus().deleteRange(r).setParagraph().run() },
  { title: "Heading 1", hint: "#", keywords: "h1 title", run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 1 }).run() },
  { title: "Heading 2", hint: "##", keywords: "h2 subtitle", run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 2 }).run() },
  { title: "Heading 3", hint: "###", keywords: "h3", run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 3 }).run() },
  { title: "Bulleted list", hint: "-", keywords: "ul unordered bullet", run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
  { title: "Numbered list", hint: "1.", keywords: "ol ordered number", run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
  { title: "To-do list", hint: "[ ]", keywords: "task checkbox todo check", run: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run() },
  { title: "Table", hint: "", keywords: "grid rows columns", run: (e, r) => e.chain().focus().deleteRange(r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { title: "Code block", hint: "```", keywords: "code pre snippet", run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run() },
  { title: "Callout", hint: "", keywords: "callout note info box aside", run: (e, r) => e.chain().focus().deleteRange(r).setCallout("note").run() },
  { title: "Tip", hint: "", keywords: "callout tip hint", run: (e, r) => e.chain().focus().deleteRange(r).setCallout("tip").run() },
  { title: "Warning", hint: "", keywords: "callout warning caution alert", run: (e, r) => e.chain().focus().deleteRange(r).setCallout("warning").run() },
  { title: "Quote", hint: ">", keywords: "blockquote citation", run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
  { title: "Divider", hint: "---", keywords: "hr horizontal rule line separator", run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
  { title: "Image", hint: "", keywords: "picture photo upload", run: (e, r) => { e.chain().focus().deleteRange(r).run(); pickImage(e); } },
  { title: "Link", hint: "", keywords: "url hyperlink web address", run: insertLink },
  { title: "Link to file", hint: "[[", keywords: "file document page wiki backlink internal", run: (e, r) => e.chain().focus().deleteRange(r).insertContent("[[").run() },
  { title: "Embed", hint: "", keywords: "embed video youtube vimeo loom figma spotify codepen maps slides sheets tweet iframe", run: insertEmbed },
  { title: "Diagram", hint: "", keywords: "diagram mermaid flowchart chart sequence graph", run: insertDiagram },
  { title: "Equation", hint: "$x$", keywords: "math inline latex formula katex", run: (e, r) => insertMath(e, r, false) },
  { title: "Math block", hint: "$$", keywords: "math display equation latex formula katex", run: (e, r) => insertMath(e, r, true) },
  { title: "Page break", hint: "Ctrl+Enter", keywords: "new page break", run: (e, r) => e.chain().focus().deleteRange(r).setPageBreak().run() },
];

export function filterSlashItems(query: string): SlashItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter((i) => i.title.toLowerCase().includes(q) || i.keywords.includes(q));
}

type MenuProps = SuggestionProps<SlashItem>;
export interface MenuHandle {
  onKeyDown: (p: SuggestionKeyDownProps) => boolean;
}

const SlashMenu = forwardRef<MenuHandle, MenuProps>(function SlashMenu({ items, command }, ref) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => setActive(0), [items]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items.length) return false;
      if (event.key === "ArrowDown") {
        setActive((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setActive((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        command(items[active]);
        return true;
      }
      return false;
    },
  }));

  if (!items.length) {
    return (
      <div className="w-60 rounded-lg border border-border bg-popover px-3 py-2 text-[13px] text-muted-foreground shadow-float">
        No matching blocks
      </div>
    );
  }
  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label="Insert block"
      className="max-h-80 w-60 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-float"
    >
      {items.map((item, i) => (
        <button
          key={item.title}
          type="button"
          role="option"
          aria-selected={i === active}
          data-index={i}
          onMouseEnter={() => setActive(i)}
          onMouseDown={(e) => {
            e.preventDefault();
            command(item);
          }}
          className={cn(
            "flex h-8 w-full items-center justify-between gap-3 rounded-md px-2 text-left text-[13px] transition-colors duration-100",
            i === active && "bg-accent",
          )}
        >
          <span>{item.title}</span>
          {item.hint && <span className="font-mono text-[11px] text-muted-foreground">{item.hint}</span>}
        </button>
      ))}
    </div>
  );
});

function place(el: HTMLElement, rect: DOMRect | null | undefined) {
  if (!rect) return;
  const h = el.offsetHeight || 320;
  const below = rect.bottom + 6;
  const top = below + h > window.innerHeight - 8 ? Math.max(8, rect.top - h - 6) : below;
  el.style.left = `${Math.min(rect.left, window.innerWidth - 248)}px`;
  el.style.top = `${top}px`;
}

/** Mounts a suggestion list component in a fixed popup under the caret. */
export function popupRenderer<I>(Menu: ComponentType<SuggestionProps<I> & RefAttributes<MenuHandle>>): ReturnType<NonNullable<SuggestionOptions<I>["render"]>> {
  let renderer: ReactRenderer<MenuHandle, SuggestionProps<I>> | null = null;
  return {
    onStart: (props) => {
      renderer = new ReactRenderer(Menu, { props, editor: props.editor });
      const el = renderer.element as HTMLElement;
      el.style.position = "fixed";
      el.style.zIndex = "60";
      document.body.appendChild(el);
      requestAnimationFrame(() => place(el, props.clientRect?.()));
    },
    onUpdate: (props) => {
      renderer?.updateProps(props);
      if (renderer) place(renderer.element as HTMLElement, props.clientRect?.());
    },
    onKeyDown: (props) => {
      if (props.event.key === "Escape") {
        renderer?.element.remove();
        return true;
      }
      return renderer?.ref?.onKeyDown(props) ?? false;
    },
    onExit: () => {
      renderer?.element.remove();
      renderer?.destroy();
      renderer = null;
    },
  };
}

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        pluginKey: new PluginKey("slashCommand"),
        char: "/",
        startOfLine: false,
        allowSpaces: false,
        items: ({ query }) => filterSlashItems(query),
        command: ({ editor, range, props }) => props.run(editor, range),
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          return !$from.parent.type.spec.code;
        },
        render: () => popupRenderer(SlashMenu),
      }),
    ];
  },
});
