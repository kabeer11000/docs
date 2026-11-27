// Title bar menus for the PDF editor, as plain data (same shape as the other apps' menus).
import {
  type AppMenu,
  type FileCtx,
  type MenuEntry,
  tidy,
} from "@/components/app-header/menus";
import type { PdfCommands } from "./pdf-state";

const SEP = "separator" as const;

const menu = (
  id: string,
  label: string,
  items: (MenuEntry | false | null | undefined)[],
): AppMenu | null => {
  const tidied = tidy(items);
  return tidied.length ? { id, label, items: tidied } : null;
};

export function pdfMenus(c: FileCtx, x: PdfCommands | null): AppMenu[] {
  const ready = !!x;
  const edit = !c.canEdit || !ready;
  const out = !c.canDownload || !ready;
  const run = (fn: (p: PdfCommands) => void) => () => x && fn(x);
  const list = [
    menu("file", "File", [
      {
        id: "file.new",
        label: "New",
        items: [
          {
            id: "file.new.doc",
            label: "Document",
            run: () => c.newFile("doc"),
          },
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
      {
        id: "file.insertPdf",
        label: "Insert pages from PDF...",
        run: run((p) => p.insertFromPdf()),
        disabled: edit,
      },
      {
        id: "file.convert",
        label: "Convert to document",
        run: run((p) => p.convertToDoc()),
        disabled: out,
      },
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
      { id: "file.details", label: "Details", run: c.details },
      SEP,
      {
        id: "file.download",
        label: "Download PDF",
        hint: ".pdf",
        run: run((p) => p.downloadPdf()),
        disabled: out,
      },
      {
        id: "file.original",
        label: "Download original",
        run: run((p) => p.downloadOriginal()),
        disabled: out,
      },
      {
        id: "file.extract",
        label: "Extract selected pages",
        run: run((p) => p.extractPages()),
        disabled: out,
      },
      {
        id: "file.split",
        label: "Split after this page",
        run: run((p) => p.splitAfter()),
        disabled: out,
      },
      {
        id: "file.print",
        label: "Print",
        shortcut: "Mod+P",
        run: run((p) => p.print()),
        disabled: out,
      },
      SEP,
      {
        id: "file.trash",
        label: "Move to trash",
        run: c.trash,
        disabled: !c.canDelete,
        destructive: true,
      },
    ]),
    menu("edit", "Edit", [
      {
        id: "edit.undo",
        label: "Undo",
        shortcut: "Mod+Z",
        run: run((p) => p.undo()),
        disabled: edit || !x?.canUndo,
      },
      {
        id: "edit.redo",
        label: "Redo",
        shortcut: "Mod+Shift+Z",
        run: run((p) => p.redo()),
        disabled: edit || !x?.canRedo,
      },
      SEP,
      {
        id: "edit.delete",
        label: "Delete",
        hint: "Del",
        run: run((p) => p.deleteSelection()),
        disabled: edit || !x?.hasSelection,
      },
      SEP,
      {
        id: "edit.find",
        label: "Find",
        shortcut: "Mod+F",
        run: run((p) => p.find()),
        disabled: !ready,
      },
    ]),
    menu("view", "View", [
      {
        id: "view.zoomIn",
        label: "Zoom in",
        shortcut: "Mod+=",
        run: run((p) => p.zoom("in")),
        disabled: !ready,
      },
      {
        id: "view.zoomOut",
        label: "Zoom out",
        shortcut: "Mod+-",
        run: run((p) => p.zoom("out")),
        disabled: !ready,
      },
      {
        id: "view.actual",
        label: "Actual size",
        shortcut: "Mod+0",
        run: run((p) => p.zoom(1)),
        disabled: !ready,
      },
      {
        id: "view.fitWidth",
        label: "Fit width",
        run: run((p) => p.zoom("width")),
        disabled: !ready,
      },
      {
        id: "view.fitPage",
        label: "Fit page",
        run: run((p) => p.zoom("page")),
        disabled: !ready,
      },
      SEP,
      {
        id: "view.rotate",
        label: "Rotate view",
        run: run((p) => p.rotateView()),
        disabled: !ready,
      },
      SEP,
      {
        id: "view.thumbnails",
        label: "Page thumbnails",
        run: run((p) => p.toggleThumbnails()),
        checked: !!x?.thumbnails,
        disabled: !ready,
      },
      x?.hasOutline && {
        id: "view.outline",
        label: "Bookmarks",
        run: run((p) => p.toggleOutline()),
        checked: x.outline,
      },
    ]),
    menu("insert", "Insert", [
      {
        id: "insert.text",
        label: "Text box",
        shortcut: "T",
        run: run((p) => p.insert("text")),
        disabled: edit,
      },
      {
        id: "insert.note",
        label: "Sticky note",
        shortcut: "N",
        run: run((p) => p.insert("note")),
        disabled: edit,
      },
      {
        id: "insert.shape",
        label: "Shape",
        items: [
          {
            id: "insert.rect",
            label: "Rectangle",
            shortcut: "R",
            run: run((p) => p.insert("rect")),
            disabled: edit,
          },
          {
            id: "insert.ellipse",
            label: "Ellipse",
            shortcut: "O",
            run: run((p) => p.insert("ellipse")),
            disabled: edit,
          },
          {
            id: "insert.line",
            label: "Line",
            shortcut: "L",
            run: run((p) => p.insert("line")),
            disabled: edit,
          },
          {
            id: "insert.arrow",
            label: "Arrow",
            shortcut: "A",
            run: run((p) => p.insert("arrow")),
            disabled: edit,
          },
        ],
      },
      {
        id: "insert.image",
        label: "Image...",
        run: run((p) => p.insert("image")),
        disabled: edit,
      },
      SEP,
      {
        id: "insert.signature",
        label: "Signature...",
        run: run((p) => p.insert("signature")),
        disabled: edit,
      },
      {
        id: "insert.initials",
        label: "Initials...",
        run: run((p) => p.insert("initials")),
        disabled: edit,
      },
      {
        id: "insert.date",
        label: "Date",
        run: run((p) => p.insert("date")),
        disabled: edit,
      },
      {
        id: "insert.stamp",
        label: "Stamp",
        items: (
          ["Approved", "Draft", "Rejected", "Confidential", "Date"] as const
        ).map((k) => ({
          id: `insert.stamp.${k.toLowerCase()}`,
          label: k === "Date" ? "Date stamp" : k,
          run: run((p) => p.stamp(k)),
          disabled: edit,
        })),
      },
    ]),
    menu("page", "Page", [
      {
        id: "page.rotateRight",
        label: "Rotate clockwise",
        run: run((p) => p.rotatePages(90)),
        disabled: edit,
      },
      {
        id: "page.rotateLeft",
        label: "Rotate counterclockwise",
        run: run((p) => p.rotatePages(-90)),
        disabled: edit,
      },
      SEP,
      {
        id: "page.duplicate",
        label: "Duplicate",
        run: run((p) => p.duplicatePages()),
        disabled: edit,
      },
      {
        id: "page.blank",
        label: "Insert blank page",
        run: run((p) => p.insertBlank()),
        disabled: edit,
      },
      {
        id: "page.fromPdf",
        label: "Insert pages from PDF...",
        run: run((p) => p.insertFromPdf()),
        disabled: edit,
      },
      SEP,
      {
        id: "page.delete",
        label: "Delete",
        run: run((p) => p.deletePages()),
        disabled: edit,
        destructive: true,
      },
    ]),
  ];
  return list.filter((m): m is AppMenu => !!m);
}
