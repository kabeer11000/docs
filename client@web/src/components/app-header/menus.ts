// Menu bar definitions for the three apps, as plain data built from a context of handlers.
// Pure: no React, no DOM. Shortcuts are written "Mod+Shift+O" and formatted per platform when rendered.
import type { FileKind } from "@/lib/files";

export interface MenuAction {
  id: string;
  label: string;
  run: () => void;
  shortcut?: string;
  /** Short trailing hint (a file extension) when there is no shortcut. */
  hint?: string;
  disabled?: boolean;
  checked?: boolean;
  destructive?: boolean;
}
export interface MenuSub {
  id: string;
  label: string;
  items: MenuEntry[];
  disabled?: boolean;
}
export type MenuEntry = MenuAction | MenuSub | "separator";
export interface AppMenu {
  id: string;
  label: string;
  items: MenuEntry[];
}

export const isSub = (e: MenuEntry): e is MenuSub =>
  e !== "separator" && "items" in e;

const SEP = "separator" as const;

/** Drops empty submenus and leading, trailing and doubled separators. */
export function tidy(
  items: (MenuEntry | false | null | undefined)[],
): MenuEntry[] {
  const out: MenuEntry[] = [];
  for (const item of items) {
    if (!item) continue;
    if (item === SEP) {
      if (out.length && out[out.length - 1] !== SEP) out.push(SEP);
    } else if (isSub(item)) {
      const sub = { ...item, items: tidy(item.items) };
      if (sub.items.length) out.push(sub);
    } else out.push(item);
  }
  if (out[out.length - 1] === SEP) out.pop();
  return out;
}

const menu = (
  id: string,
  label: string,
  items: (MenuEntry | false | null | undefined)[],
): AppMenu | null => {
  const tidied = tidy(items);
  return tidied.length ? { id, label, items: tidied } : null;
};
const menus = (list: (AppMenu | null)[]) =>
  list.filter((m): m is AppMenu => !!m);

/** Every action in a menu tree, depth first. */
export function actionsOf(entries: MenuEntry[]): MenuAction[] {
  return entries.flatMap((e) =>
    e === SEP ? [] : isSub(e) ? actionsOf(e.items) : [e],
  );
}

const MAC_KEYS: Record<string, string> = {
  Mod: "⌘",
  Shift: "⇧",
  Alt: "⌥",
  Ctrl: "⌃",
  Enter: "↩",
};
const MAC_ORDER = ["Ctrl", "Alt", "Shift", "Mod"];

/** "Mod+Shift+O" as the platform writes it: "⇧⌘O" on a Mac, "Ctrl+Shift+O" elsewhere. */
export function formatShortcut(shortcut: string, mac: boolean): string {
  const parts = shortcut.split("+");
  const key = parts.pop() ?? "";
  if (!mac)
    return [...parts.map((p) => (p === "Mod" ? "Ctrl" : p)), key].join("+");
  const mods = MAC_ORDER.filter((m) => parts.includes(m)).map(
    (m) => MAC_KEYS[m],
  );
  return mods.join("") + (MAC_KEYS[key] ?? key.toUpperCase());
}

// ---------------------------------------------------------------------------------------------
// Shared file actions (every app)

export interface FileCtx {
  kind: FileKind;
  canEdit: boolean;
  canRename: boolean;
  canShare: boolean;
  canDelete: boolean;
  canDownload: boolean;
  newFile: (kind: FileKind) => void;
  /** Any supported file becomes a new file of the right kind. */
  importFile: () => void;
  makeCopy: () => void;
  share: () => void;
  rename: () => void;
  details: () => void;
  trash: () => void;
}

interface FileParts {
  /** Conversions, after Import. */
  open?: MenuEntry[];
  /** After Rename (version history). */
  manage?: MenuEntry[];
  /** Download as, copy as, page setup, print. */
  output: MenuEntry[];
}

function fileMenu(c: FileCtx, p: FileParts): AppMenu | null {
  return menu("file", "File", [
    {
      id: "file.new",
      label: "New",
      items: [
        { id: "file.new.doc", label: "Document", run: () => c.newFile("doc") },
        {
          id: "file.new.sheet",
          label: "Spreadsheet",
          run: () => c.newFile("sheet"),
        },
        {
          id: "file.new.slides",
          label: "Presentation",
          run: () => c.newFile("slides"),
        },
      ],
    },
    { id: "file.import", label: "Import file...", run: c.importFile },
    ...(p.open ?? []),
    {
      id: "file.copy",
      label: "Make a copy",
      run: c.makeCopy,
      disabled: !c.canDownload,
    },
    SEP,
    {
      id: "file.share",
      label: "Share and publish...",
      run: c.share,
      disabled: !c.canShare,
    },
    SEP,
    {
      id: "file.rename",
      label: "Rename",
      run: c.rename,
      disabled: !c.canRename,
    },
    ...(p.manage ?? []),
    { id: "file.details", label: "Details", run: c.details },
    SEP,
    ...p.output,
    SEP,
    {
      id: "file.trash",
      label: "Move to trash",
      run: c.trash,
      disabled: !c.canDelete,
      destructive: true,
    },
  ]);
}

const downloads = (
  disabled: boolean,
  items: { id: string; label: string; hint: string; run: () => void }[],
): MenuSub => ({
  id: "file.download",
  label: "Download as",
  disabled,
  items: items.map((i) => ({ ...i, disabled })),
});

// ---------------------------------------------------------------------------------------------
// Document

export type DocDownload = "pdf" | "docx" | "md" | "html" | "txt";
export type DocFormat =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "highlight"
  | "code"
  | "superscript"
  | "subscript"
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "alignLeft"
  | "alignCenter"
  | "alignRight"
  | "alignJustify"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "blockquote"
  | "codeBlock"
  | "clear";

/** Slash-command blocks offered in Insert, by their title. */
export const DOC_INSERTS = [
  "Table",
  "Image",
  "Link",
  "Link to file",
  "Embed",
  "Diagram",
  "Equation",
  "Math block",
  "Callout",
  "Divider",
  "Page break",
  "Code block",
] as const;
export type DocInsert = (typeof DOC_INSERTS)[number];

export interface DocCtx extends FileCtx {
  hasEditor: boolean;
  canUndo: boolean;
  canRedo: boolean;
  outlineOpen: boolean;
  focusMode: boolean;
  commentsOpen: boolean;
  convertToSlides: () => void;
  versionHistory: () => void;
  download: (kind: DocDownload) => void;
  copyAs: (kind: "md" | "html") => void;
  pageSetup: () => void;
  print: () => void;
  undo: () => void;
  redo: () => void;
  selectAll: () => void;
  find: () => void;
  replace: () => void;
  toggleOutline: () => void;
  toggleFocusMode: () => void;
  toggleComments: () => void;
  insert: (block: DocInsert) => void;
  format: (f: DocFormat) => void;
  shortcuts: () => void;
}

const INSERT_SHORTCUTS: Partial<Record<DocInsert, string>> = {
  "Page break": "Mod+Enter",
};

export function docMenus(c: DocCtx): AppMenu[] {
  const edit = !c.canEdit || !c.hasEditor;
  const f = (id: DocFormat, label: string, shortcut?: string): MenuAction => ({
    id: `format.${id}`,
    label,
    shortcut,
    disabled: edit,
    run: () => c.format(id),
  });
  return menus([
    fileMenu(c, {
      open: [
        {
          id: "file.convert",
          label: "Convert to presentation",
          run: c.convertToSlides,
          disabled: !c.canDownload,
        },
      ],
      manage: [
        {
          id: "file.versions",
          label: "Version history",
          run: c.versionHistory,
        },
      ],
      output: [
        downloads(!c.canDownload, [
          {
            id: "file.download.pdf",
            label: "PDF",
            hint: ".pdf",
            run: () => c.download("pdf"),
          },
          {
            id: "file.download.docx",
            label: "Word",
            hint: ".docx",
            run: () => c.download("docx"),
          },
          {
            id: "file.download.md",
            label: "Markdown",
            hint: ".md",
            run: () => c.download("md"),
          },
          {
            id: "file.download.html",
            label: "Web page",
            hint: ".html",
            run: () => c.download("html"),
          },
          {
            id: "file.download.txt",
            label: "Plain text",
            hint: ".txt",
            run: () => c.download("txt"),
          },
        ]),
        {
          id: "file.copyAs",
          label: "Copy as",
          disabled: !c.canDownload,
          items: [
            {
              id: "file.copyAs.md",
              label: "Markdown",
              run: () => c.copyAs("md"),
              disabled: !c.canDownload,
            },
            {
              id: "file.copyAs.html",
              label: "HTML",
              run: () => c.copyAs("html"),
              disabled: !c.canDownload,
            },
          ],
        },
        SEP,
        {
          id: "file.pageSetup",
          label: "Page setup...",
          run: c.pageSetup,
          disabled: !c.canEdit,
        },
        { id: "file.print", label: "Print", shortcut: "Mod+P", run: c.print },
      ],
    }),
    menu("edit", "Edit", [
      {
        id: "edit.undo",
        label: "Undo",
        shortcut: "Mod+Z",
        run: c.undo,
        disabled: edit || !c.canUndo,
      },
      {
        id: "edit.redo",
        label: "Redo",
        shortcut: "Mod+Shift+Z",
        run: c.redo,
        disabled: edit || !c.canRedo,
      },
      SEP,
      {
        id: "edit.selectAll",
        label: "Select all",
        shortcut: "Mod+A",
        run: c.selectAll,
        disabled: !c.hasEditor,
      },
      SEP,
      {
        id: "edit.find",
        label: "Find",
        shortcut: "Mod+F",
        run: c.find,
        disabled: !c.hasEditor,
      },
      {
        id: "edit.replace",
        label: "Find and replace",
        shortcut: "Mod+H",
        run: c.replace,
        disabled: edit,
      },
    ]),
    menu("view", "View", [
      {
        id: "view.outline",
        label: "Outline",
        shortcut: "Mod+Shift+O",
        run: c.toggleOutline,
        checked: c.outlineOpen,
      },
      {
        id: "view.comments",
        label: "Comments",
        run: c.toggleComments,
        checked: c.commentsOpen,
      },
      SEP,
      {
        id: "view.focus",
        label: "Focus mode",
        shortcut: "Mod+Shift+F",
        run: c.toggleFocusMode,
        checked: c.focusMode,
      },
    ]),
    menu(
      "insert",
      "Insert",
      DOC_INSERTS.flatMap((block) => [
        ...(block === "Callout" || block === "Embed" ? [SEP] : []),
        {
          id: `insert.${block.toLowerCase().replace(/\s+/g, "-")}`,
          label: block,
          shortcut: INSERT_SHORTCUTS[block],
          disabled: edit,
          run: () => c.insert(block),
        },
      ]),
    ),
    menu("format", "Format", [
      {
        id: "format.text",
        label: "Text",
        items: [
          f("bold", "Bold", "Mod+B"),
          f("italic", "Italic", "Mod+I"),
          f("underline", "Underline", "Mod+U"),
          f("strike", "Strikethrough", "Mod+Shift+S"),
          f("highlight", "Highlight", "Mod+Shift+H"),
          f("code", "Inline code", "Mod+E"),
          SEP,
          f("superscript", "Superscript", "Mod+."),
          f("subscript", "Subscript", "Mod+,"),
        ],
      },
      {
        id: "format.style",
        label: "Paragraph style",
        items: [
          f("paragraph", "Normal text", "Mod+Alt+0"),
          f("h1", "Heading 1", "Mod+Alt+1"),
          f("h2", "Heading 2", "Mod+Alt+2"),
          f("h3", "Heading 3", "Mod+Alt+3"),
          SEP,
          f("blockquote", "Quote", "Mod+Shift+B"),
          f("codeBlock", "Code block", "Mod+Alt+C"),
        ],
      },
      {
        id: "format.align",
        label: "Align",
        items: [
          f("alignLeft", "Left", "Mod+Shift+L"),
          f("alignCenter", "Center", "Mod+Shift+E"),
          f("alignRight", "Right", "Mod+Shift+R"),
          f("alignJustify", "Justified", "Mod+Shift+J"),
        ],
      },
      {
        id: "format.lists",
        label: "Lists",
        items: [
          f("bulletList", "Bulleted list", "Mod+Shift+8"),
          f("orderedList", "Numbered list", "Mod+Shift+7"),
          f("taskList", "To-do list", "Mod+Shift+9"),
        ],
      },
      SEP,
      f("clear", "Clear formatting"),
    ]),
    menu("tools", "Tools", [
      { id: "tools.wordCount", label: "Word count", run: c.details },
      {
        id: "tools.shortcuts",
        label: "Keyboard shortcuts",
        shortcut: "Mod+/",
        run: c.shortcuts,
      },
    ]),
  ]);
}

// ---------------------------------------------------------------------------------------------
// Spreadsheet

/** What the grid can do from the menus; anything the engine does not provide is left out of the menus. */
export interface SheetCommands {
  undo?: () => void;
  redo?: () => void;
  insertChart?: () => void;
  insertRow?: (where: "above" | "below") => void;
  insertColumn?: (where: "left" | "right") => void;
  sort?: (ascending: boolean) => void;
  toggleFilter?: () => void;
}

export interface SheetCtx extends FileCtx {
  hasEngine: boolean;
  commands: SheetCommands;
  download: (kind: "xlsx" | "csv" | "pdf") => void;
}

export function sheetMenus(c: SheetCtx): AppMenu[] {
  const x = c.commands;
  const edit = !c.canEdit || !c.hasEngine;
  const noDownload = !c.canDownload || !c.hasEngine;
  return menus([
    fileMenu(c, {
      output: [
        downloads(noDownload, [
          {
            id: "file.download.xlsx",
            label: "Excel",
            hint: ".xlsx",
            run: () => c.download("xlsx"),
          },
          {
            id: "file.download.csv",
            label: "CSV, this sheet",
            hint: ".csv",
            run: () => c.download("csv"),
          },
          {
            id: "file.download.pdf",
            label: "PDF, this sheet",
            hint: ".pdf",
            run: () => c.download("pdf"),
          },
        ]),
      ],
    }),
    menu("edit", "Edit", [
      x.undo && {
        id: "edit.undo",
        label: "Undo",
        shortcut: "Mod+Z",
        run: x.undo,
        disabled: edit,
      },
      x.redo && {
        id: "edit.redo",
        label: "Redo",
        shortcut: "Mod+Shift+Z",
        run: x.redo,
        disabled: edit,
      },
    ]),
    menu("insert", "Insert", [
      x.insertChart && {
        id: "insert.chart",
        label: "Chart",
        run: x.insertChart,
        disabled: edit,
      },
      SEP,
      x.insertRow && {
        id: "insert.rowAbove",
        label: "Row above",
        run: () => x.insertRow?.("above"),
        disabled: edit,
      },
      x.insertRow && {
        id: "insert.rowBelow",
        label: "Row below",
        run: () => x.insertRow?.("below"),
        disabled: edit,
      },
      SEP,
      x.insertColumn && {
        id: "insert.colLeft",
        label: "Column left",
        run: () => x.insertColumn?.("left"),
        disabled: edit,
      },
      x.insertColumn && {
        id: "insert.colRight",
        label: "Column right",
        run: () => x.insertColumn?.("right"),
        disabled: edit,
      },
    ]),
    menu("data", "Data", [
      x.sort && {
        id: "data.sortAsc",
        label: "Sort A to Z",
        run: () => x.sort?.(true),
        disabled: edit,
      },
      x.sort && {
        id: "data.sortDesc",
        label: "Sort Z to A",
        run: () => x.sort?.(false),
        disabled: edit,
      },
      SEP,
      x.toggleFilter && {
        id: "data.filter",
        label: "Filter",
        run: x.toggleFilter,
        disabled: edit,
      },
    ]),
  ]);
}

// ---------------------------------------------------------------------------------------------
// Presentation

export type SlidesLibrary =
  | "shapes"
  | "icons"
  | "charts"
  | "images"
  | "backgrounds";

/** What the open deck offers beyond presenting and export; anything missing is left out of the menus. */
export interface SlidesExtras {
  addText?: () => void;
  insertImage?: () => void;
  openLibrary?: (tab: SlidesLibrary) => void;
  openTemplates?: () => void;
  deleteSlide?: () => void;
  toggleNotes?: () => void;
  bringToFront?: () => void;
  sendToBack?: () => void;
  /** Selected elements on the current slide; arrange items need one. */
  selectedCount?: number;
}

export interface SlidesCtx extends FileCtx {
  hasDeck: boolean;
  extras: SlidesExtras;
  downloadPptx: () => void;
  downloadHtml: () => void;
  print: () => void;
  newSlide: () => void;
  duplicateSlide: () => void;
  present: (mode: "start" | "current" | "presenter") => void;
}

export function slidesMenus(c: SlidesCtx): AppMenu[] {
  const x = c.extras;
  const edit = !c.canEdit || !c.hasDeck;
  const noSelection = edit || !x.selectedCount;
  const lib = (tab: SlidesLibrary, label: string): MenuAction | false =>
    !!x.openLibrary && {
      id: `insert.${tab}`,
      label,
      run: () => x.openLibrary?.(tab),
      disabled: edit,
    };
  return menus([
    fileMenu(c, {
      output: [
        downloads(!c.canDownload || !c.hasDeck, [
          {
            id: "file.download.pptx",
            label: "PowerPoint",
            hint: ".pptx",
            run: c.downloadPptx,
          },
          {
            id: "file.download.html",
            label: "Web page",
            hint: ".html",
            run: c.downloadHtml,
          },
        ]),
        {
          id: "file.print",
          label: "Print or save as PDF",
          run: c.print,
          disabled: !c.hasDeck,
        },
      ],
    }),
    menu("insert", "Insert", [
      x.addText && {
        id: "insert.text",
        label: "Text box",
        run: x.addText,
        disabled: edit,
      },
      x.insertImage && {
        id: "insert.image",
        label: "Image...",
        run: x.insertImage,
        disabled: edit,
      },
      lib("shapes", "Shape"),
      lib("icons", "Icon"),
      lib("charts", "Chart"),
    ]),
    menu("arrange", "Arrange", [
      x.bringToFront && {
        id: "arrange.front",
        label: "Bring to front",
        run: x.bringToFront,
        disabled: noSelection,
      },
      x.sendToBack && {
        id: "arrange.back",
        label: "Send to back",
        run: x.sendToBack,
        disabled: noSelection,
      },
    ]),
    menu("slide", "Slide", [
      {
        id: "slide.new",
        label: "New slide",
        shortcut: "Mod+Enter",
        run: c.newSlide,
        disabled: edit,
      },
      {
        id: "slide.duplicate",
        label: "Duplicate slide",
        shortcut: "Mod+D",
        run: c.duplicateSlide,
        disabled: edit,
      },
      x.deleteSlide && {
        id: "slide.delete",
        label: "Delete slide",
        run: x.deleteSlide,
        disabled: edit,
      },
      SEP,
      x.openTemplates && {
        id: "slide.templates",
        label: "Templates...",
        run: x.openTemplates,
        disabled: edit,
      },
      lib("backgrounds", "Backdrop"),
      SEP,
      x.toggleNotes && {
        id: "slide.notes",
        label: "Speaker notes",
        run: x.toggleNotes,
      },
    ]),
    menu("present", "Present", [
      {
        id: "present.start",
        label: "From the beginning",
        shortcut: "F5",
        run: () => c.present("start"),
        disabled: !c.hasDeck,
      },
      {
        id: "present.current",
        label: "From this slide",
        shortcut: "Shift+F5",
        run: () => c.present("current"),
        disabled: !c.hasDeck,
      },
      {
        id: "present.presenter",
        label: "Presenter view",
        run: () => c.present("presenter"),
        disabled: !c.hasDeck,
      },
    ]),
  ]);
}
