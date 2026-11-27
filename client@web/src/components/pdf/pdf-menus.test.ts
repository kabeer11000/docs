import { describe, expect, it, vi } from "vitest";
import { actionsOf, type FileCtx } from "@/components/app-header/menus";
import { pdfMenus } from "./pdf-menus";
import type { PdfCommands } from "./pdf-state";

const file = (canEdit: boolean): FileCtx => ({
  kind: "doc",
  canEdit,
  canRename: canEdit,
  canShare: canEdit,
  canDelete: canEdit,
  canDownload: true,
  newFile: vi.fn(),
  importFile: vi.fn(),
  makeCopy: vi.fn(),
  share: vi.fn(),
  rename: vi.fn(),
  details: vi.fn(),
  trash: vi.fn(),
});

const commands = () =>
  new Proxy(
    {
      canUndo: true,
      canRedo: false,
      hasSelection: true,
      thumbnails: true,
      outline: false,
      hasOutline: false,
    } as unknown as PdfCommands,
    {
      get: (t, k) => (k in t ? t[k as keyof PdfCommands] : vi.fn()),
    },
  );

describe("pdf menus", () => {
  it("has the File, Edit, View, Insert and Page menus", () => {
    expect(pdfMenus(file(true), commands()).map((m) => m.label)).toEqual([
      "File",
      "Edit",
      "View",
      "Insert",
      "Page",
    ]);
  });

  it("disables editing for viewers but keeps downloads", () => {
    const all = pdfMenus(file(false), commands()).flatMap((m) =>
      actionsOf(m.items),
    );
    const byId = (id: string) => all.find((a) => a.id === id);
    expect(byId("insert.text")?.disabled).toBe(true);
    expect(byId("page.delete")?.disabled).toBe(true);
    expect(byId("edit.undo")?.disabled).toBe(true);
    expect(byId("file.download")?.disabled).toBe(false);
    expect(byId("file.print")?.disabled).toBe(false);
  });

  it("disables everything that needs the open PDF until it is ready", () => {
    const all = pdfMenus(file(true), null).flatMap((m) => actionsOf(m.items));
    expect(all.find((a) => a.id === "file.download")?.disabled).toBe(true);
    expect(all.find((a) => a.id === "file.rename")?.disabled).toBe(false);
  });

  it("shows bookmarks only when the PDF has an outline and runs commands", () => {
    const c = commands();
    expect(
      pdfMenus(file(true), c)
        .flatMap((m) => actionsOf(m.items))
        .some((a) => a.id === "view.outline"),
    ).toBe(false);
    const withOutline = {
      ...c,
      hasOutline: true,
      rotatePages: vi.fn(),
    } as PdfCommands;
    const all = pdfMenus(file(true), withOutline).flatMap((m) =>
      actionsOf(m.items),
    );
    expect(all.some((a) => a.id === "view.outline")).toBe(true);
    all.find((a) => a.id === "page.rotateRight")?.run();
    expect(withOutline.rotatePages).toHaveBeenCalledWith(90);
  });
});
