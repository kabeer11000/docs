"use client";
import { type Editor, Extension, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionOptions,
  type SuggestionProps,
} from "@tiptap/suggestion";
import {
  CheckSquare,
  Code2,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Info,
  Lightbulb,
  Link2,
  List,
  ListOrdered,
  type LucideIcon,
  Minus,
  PlaySquare,
  Quote,
  Scissors,
  Sigma,
  SquareFunction,
  Table,
  TriangleAlert,
  Type,
  Workflow,
} from "lucide-react";
import {
  type ComponentType,
  forwardRef,
  type RefAttributes,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { menuItem, menuSurface } from "@/components/ui/menu-styles";
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
  icon: LucideIcon;
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

/** Web, mail and phone links only; bare domains get https. Null (with a toast) otherwise. */
function safeHref(raw: string): string | null {
  const href = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  if (/^(https?|mailto|tel):/i.test(href)) return href;
  showToast.error("Only web, mail and phone links are allowed");
  return null;
}

function linkTo(editor: Editor, raw: string) {
  const href = safeHref(raw);
  if (!href) return;
  editor
    .chain()
    .focus()
    .insertContent({
      type: "text",
      text: raw,
      marks: [{ type: "link", attrs: { href } }],
    })
    .insertContent(" ")
    .run();
}

async function insertLink(editor: Editor, range: Range) {
  editor.chain().focus().deleteRange(range).run();
  const raw = await askInline(editor, {
    label: "Link address",
    placeholder: "Paste or type a link",
  });
  if (raw) linkTo(editor, raw);
}

/** Link the selected text (or insert a link at the caret); clicking on an existing link removes it. */
export async function promptLink(editor: Editor) {
  if (editor.isActive("link")) {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  const { empty } = editor.state.selection;
  const raw = await askInline(editor, {
    label: "Link address",
    placeholder: "Paste or type a link",
  });
  if (!raw) return;
  if (empty) return linkTo(editor, raw);
  const href = safeHref(raw);
  if (href) editor.chain().focus().setLink({ href }).run();
}

async function insertEmbed(editor: Editor, range: Range) {
  editor.chain().focus().deleteRange(range).run();
  const raw = await askInline(editor, {
    label: "Embed link",
    placeholder: "YouTube, Figma, Loom, Spotify, Maps...",
  });
  if (raw && !editor.chain().focus().setEmbed(raw).run()) linkTo(editor, raw);
}

async function insertMath(editor: Editor, range: Range, block: boolean) {
  editor.chain().focus().deleteRange(range).run();
  const latex = await askLatex(editor);
  if (!latex) return;
  const chain = editor.chain().focus();
  (block
    ? chain.insertBlockMath({ latex })
    : chain.insertInlineMath({ latex })
  ).run();
}

function insertDiagram(editor: Editor, range: Range) {
  const pos = range.from;
  editor.chain().focus().deleteRange(range).insertDiagram().run();
  // The diagram lands at the cursor, or right after the paragraph it split.
  const at = [pos, pos + 1, pos - 1].find(
    (p) => editor.state.doc.nodeAt(p)?.type.name === "diagram",
  );
  if (at != null) requestAnimationFrame(() => editDiagram(editor, at));
}

export const SLASH_ITEMS: SlashItem[] = [
  {
    title: "Text",
    icon: Type,
    hint: "",
    keywords: "paragraph plain",
    run: (e, r) => e.chain().focus().deleteRange(r).setParagraph().run(),
  },
  {
    title: "Heading 1",
    icon: Heading1,
    hint: "#",
    keywords: "h1 title",
    run: (e, r) =>
      e.chain().focus().deleteRange(r).setHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    icon: Heading2,
    hint: "##",
    keywords: "h2 subtitle",
    run: (e, r) =>
      e.chain().focus().deleteRange(r).setHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    icon: Heading3,
    hint: "###",
    keywords: "h3",
    run: (e, r) =>
      e.chain().focus().deleteRange(r).setHeading({ level: 3 }).run(),
  },
  {
    title: "Bulleted list",
    icon: List,
    hint: "-",
    keywords: "ul unordered bullet",
    run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    icon: ListOrdered,
    hint: "1.",
    keywords: "ol ordered number",
    run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run(),
  },
  {
    title: "To-do list",
    icon: CheckSquare,
    hint: "[ ]",
    keywords: "task checkbox todo check",
    run: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run(),
  },
  {
    title: "Table",
    icon: Table,
    hint: "",
    keywords: "grid rows columns",
    run: (e, r) =>
      e
        .chain()
        .focus()
        .deleteRange(r)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: "Code block",
    icon: Code2,
    hint: "```",
    keywords: "code pre snippet",
    run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run(),
  },
  {
    title: "Callout",
    icon: Info,
    hint: "",
    keywords: "callout note info box aside",
    run: (e, r) => e.chain().focus().deleteRange(r).setCallout("note").run(),
  },
  {
    title: "Tip",
    icon: Lightbulb,
    hint: "",
    keywords: "callout tip hint",
    run: (e, r) => e.chain().focus().deleteRange(r).setCallout("tip").run(),
  },
  {
    title: "Warning",
    icon: TriangleAlert,
    hint: "",
    keywords: "callout warning caution alert",
    run: (e, r) => e.chain().focus().deleteRange(r).setCallout("warning").run(),
  },
  {
    title: "Quote",
    icon: Quote,
    hint: ">",
    keywords: "blockquote citation",
    run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run(),
  },
  {
    title: "Divider",
    icon: Minus,
    hint: "---",
    keywords: "hr horizontal rule line separator",
    run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run(),
  },
  {
    title: "Image",
    icon: ImageIcon,
    hint: "",
    keywords: "picture photo upload",
    run: (e, r) => {
      e.chain().focus().deleteRange(r).run();
      pickImage(e);
    },
  },
  {
    title: "Link",
    icon: Link2,
    hint: "",
    keywords: "url hyperlink web address",
    run: insertLink,
  },
  {
    title: "Link to file",
    icon: FileText,
    hint: "[[",
    keywords: "file document page wiki backlink internal",
    run: (e, r) => e.chain().focus().deleteRange(r).insertContent("[[").run(),
  },
  {
    title: "Embed",
    icon: PlaySquare,
    hint: "",
    keywords:
      "embed video youtube vimeo loom figma spotify codepen maps slides sheets tweet iframe",
    run: insertEmbed,
  },
  {
    title: "Diagram",
    icon: Workflow,
    hint: "",
    keywords: "diagram mermaid flowchart chart sequence graph",
    run: insertDiagram,
  },
  {
    title: "Equation",
    icon: Sigma,
    hint: "$x$",
    keywords: "math inline latex formula katex",
    run: (e, r) => insertMath(e, r, false),
  },
  {
    title: "Math block",
    icon: SquareFunction,
    hint: "$$",
    keywords: "math display equation latex formula katex",
    run: (e, r) => insertMath(e, r, true),
  },
  {
    title: "Page break",
    icon: Scissors,
    hint: "Ctrl+Enter",
    keywords: "new page break",
    run: (e, r) => e.chain().focus().deleteRange(r).setPageBreak().run(),
  },
];

export function filterSlashItems(query: string): SlashItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (i) => i.title.toLowerCase().includes(q) || i.keywords.includes(q),
  );
}

type MenuProps = SuggestionProps<SlashItem>;
export interface MenuHandle {
  onKeyDown: (p: SuggestionKeyDownProps) => boolean;
}

const SlashMenu = forwardRef<MenuHandle, MenuProps>(function SlashMenu(
  { items, command },
  ref,
) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => setActive(0), [items]);
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
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
      <div
        className={cn(
          menuSurface,
          "studio-pop w-64 px-3 py-2 text-[13px] text-muted-foreground",
        )}
      >
        No matching blocks
      </div>
    );
  }
  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label="Insert block"
      className={cn(menuSurface, "studio-pop max-h-80 w-64 overflow-y-auto")}
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
          data-selected={i === active}
          className={cn(menuItem, "group h-9 text-left")}
        >
          <BlockIcon icon={item.icon} />
          <span className="flex-1 truncate">{item.title}</span>
          {item.hint && (
            <span className="font-mono text-[11px] text-muted-foreground">
              {item.hint}
            </span>
          )}
        </button>
      ))}
    </div>
  );
});

/** Small tile around a block icon; lights up in the app colour on the active row. */
export function BlockIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-muted text-muted-foreground transition-colors duration-100 group-data-[selected=true]:bg-app-soft group-data-[selected=true]:text-app group-data-[highlighted]:bg-app-soft group-data-[highlighted]:text-app">
      <Icon className="size-3.5 text-current" />
    </span>
  );
}

function place(el: HTMLElement, rect: DOMRect | null | undefined) {
  if (!rect) return;
  const h = el.offsetHeight || 320;
  const below = rect.bottom + 6;
  const top =
    below + h > window.innerHeight - 8 ? Math.max(8, rect.top - h - 6) : below;
  el.style.left = `${Math.min(rect.left, window.innerWidth - 264)}px`;
  el.style.top = `${top}px`;
}

/** Mounts a suggestion list component in a fixed popup under the caret. */
export function popupRenderer<I>(
  Menu: ComponentType<SuggestionProps<I> & RefAttributes<MenuHandle>>,
): ReturnType<NonNullable<SuggestionOptions<I>["render"]>> {
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
      if (renderer)
        place(renderer.element as HTMLElement, props.clientRect?.());
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
