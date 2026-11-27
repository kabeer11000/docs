import { describe, expect, it } from "vitest";
import {
  type AppMenu,
  actionsOf,
  DOC_INSERTS,
  type DocCtx,
  docMenus,
  formatShortcut,
  isSub,
  type SheetCtx,
  type SlidesCtx,
  sheetMenus,
  slidesMenus,
  tidy,
} from "./menus";

/** A context whose every function records its name when called, and whose flags are all "allowed". */
function stubCtx<T>(overrides: Record<string, unknown> = {}): {
  ctx: T;
  calls: string[];
} {
  const calls: string[] = [];
  const ctx = new Proxy(overrides, {
    get(target, key: string) {
      if (key in target) return target[key];
      if (/^(can|has)/.test(key)) return true;
      if (["outlineOpen", "focusMode", "commentsOpen"].includes(key))
        return false;
      if (key === "kind") return "doc";
      return (...args: unknown[]) => calls.push([key, ...args].join(":"));
    },
  });
  return { ctx: ctx as T, calls };
}

function allSheetCommands(calls: string[]) {
  const rec =
    (name: string) =>
    (...a: unknown[]) =>
      calls.push([name, ...a].join(":"));
  return {
    undo: rec("undo"),
    redo: rec("redo"),
    insertChart: rec("insertChart"),
    insertRow: rec("insertRow"),
    insertColumn: rec("insertColumn"),
    sort: rec("sort"),
    toggleFilter: rec("toggleFilter"),
  };
}

function allSlidesExtras(calls: string[]) {
  const rec =
    (name: string) =>
    (...a: unknown[]) =>
      calls.push([name, ...a].join(":"));
  return {
    addText: rec("addText"),
    insertImage: rec("insertImage"),
    openLibrary: rec("openLibrary"),
    openTemplates: rec("openTemplates"),
    deleteSlide: rec("deleteSlide"),
    toggleNotes: rec("toggleNotes"),
    bringToFront: rec("bringToFront"),
    sendToBack: rec("sendToBack"),
    selectedCount: 1,
  };
}

function build(app: "doc" | "sheet" | "slides") {
  const calls: string[] = [];
  if (app === "doc") {
    const { ctx, calls: c } = stubCtx<DocCtx>();
    return { menus: docMenus(ctx), calls: c };
  }
  if (app === "sheet") {
    const { ctx, calls: c } = stubCtx<SheetCtx>({
      kind: "sheet",
      commands: allSheetCommands(calls),
    });
    return { menus: sheetMenus(ctx), calls: c, extra: calls };
  }
  const { ctx, calls: c } = stubCtx<SlidesCtx>({
    kind: "slides",
    extras: allSlidesExtras(calls),
  });
  return { menus: slidesMenus(ctx), calls: c, extra: calls };
}

const all = (menus: AppMenu[]) => menus.flatMap((m) => actionsOf(m.items));

describe.each(["doc", "sheet", "slides"] as const)("%s menus", (app) => {
  it("has unique ids and unique shortcuts", () => {
    const { menus } = build(app);
    const actions = all(menus);
    const ids = actions.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    const subIds = menus.flatMap((m) => m.items.filter(isSub).map((s) => s.id));
    expect(new Set([...ids, ...subIds]).size).toBe(ids.length + subIds.length);
    const shortcuts = actions.flatMap((a) => (a.shortcut ? [a.shortcut] : []));
    expect(new Set(shortcuts).size).toBe(shortcuts.length);
  });

  it("gives every item a handler that reaches the context", () => {
    const built = build(app);
    for (const action of all(built.menus)) {
      const before = built.calls.length + (built.extra?.length ?? 0);
      action.run();
      expect(built.calls.length + (built.extra?.length ?? 0), action.id).toBe(
        before + 1,
      );
    }
  });

  it("never starts, ends or doubles a separator", () => {
    for (const m of build(app).menus) {
      expect(m.items[0]).not.toBe("separator");
      expect(m.items.at(-1)).not.toBe("separator");
      m.items.forEach((item, i) => {
        if (item === "separator") expect(m.items[i + 1]).not.toBe("separator");
      });
    }
  });

  it("keeps the shared file actions", () => {
    const ids = all(build(app).menus).map((a) => a.id);
    for (const id of [
      "file.new.doc",
      "file.import",
      "file.copy",
      "file.share",
      "file.rename",
      "file.details",
      "file.trash",
    ]) {
      expect(ids).toContain(id);
    }
  });
});

describe("doc menus", () => {
  it("offers everything the old File menu had", () => {
    const ids = all(build("doc").menus).map((a) => a.id);
    for (const id of [
      "file.convert",
      "file.versions",
      "file.download.pdf",
      "file.download.docx",
      "file.download.md",
      "file.download.html",
      "file.download.txt",
      "file.copyAs.md",
      "file.copyAs.html",
      "file.pageSetup",
      "file.print",
      "view.outline",
      "view.focus",
      "tools.shortcuts",
      "tools.wordCount",
    ]) {
      expect(ids).toContain(id);
    }
    expect(build("doc").menus.map((m) => m.label)).toEqual([
      "File",
      "Edit",
      "View",
      "Insert",
      "Format",
      "Tools",
    ]);
  });

  it("inserts every listed block", () => {
    const { ctx, calls } = stubCtx<DocCtx>();
    const insert = docMenus(ctx).find((m) => m.id === "insert");
    for (const a of actionsOf(insert?.items ?? [])) a.run();
    expect(calls).toEqual(DOC_INSERTS.map((b) => `insert:${b}`));
  });

  it("disables editing for viewers but keeps reading actions", () => {
    const { ctx } = stubCtx<DocCtx>({
      canEdit: false,
      canRename: false,
      canDelete: false,
      canShare: false,
    });
    const byId = new Map(all(docMenus(ctx)).map((a) => [a.id, a]));
    expect(byId.get("edit.undo")?.disabled).toBe(true);
    expect(byId.get("format.bold")?.disabled).toBe(true);
    expect(byId.get("insert.table")?.disabled).toBe(true);
    expect(byId.get("file.rename")?.disabled).toBe(true);
    expect(byId.get("file.trash")?.disabled).toBe(true);
    expect(byId.get("file.print")?.disabled).toBeFalsy();
    expect(byId.get("edit.find")?.disabled).toBeFalsy();
  });
});

describe("sheet menus", () => {
  it("leaves out what the engine cannot do", () => {
    const { ctx } = stubCtx<SheetCtx>({ kind: "sheet", commands: {} });
    const menus = sheetMenus(ctx);
    expect(menus.map((m) => m.label)).toEqual(["File"]);
    const { ctx: withChart } = stubCtx<SheetCtx>({
      kind: "sheet",
      commands: { insertChart: () => {} },
    });
    expect(sheetMenus(withChart).map((m) => m.label)).toEqual([
      "File",
      "Insert",
    ]);
  });

  it("shows every menu when the engine offers everything", () => {
    expect(build("sheet").menus.map((m) => m.label)).toEqual([
      "File",
      "Edit",
      "Insert",
      "Data",
    ]);
  });
});

describe("slides menus", () => {
  it("always offers new slide, export and present", () => {
    const { ctx } = stubCtx<SlidesCtx>({ kind: "slides", extras: {} });
    const menus = slidesMenus(ctx);
    expect(menus.map((m) => m.label)).toEqual(["File", "Slide", "Present"]);
    const ids = all(menus).map((a) => a.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "file.download.pptx",
        "file.download.html",
        "file.print",
        "slide.new",
        "present.start",
      ]),
    );
  });

  it("needs a selection to arrange", () => {
    const { ctx } = stubCtx<SlidesCtx>({
      kind: "slides",
      extras: { ...allSlidesExtras([]), selectedCount: 0 },
    });
    const front = all(slidesMenus(ctx)).find((a) => a.id === "arrange.front");
    expect(front?.disabled).toBe(true);
  });
});

describe("formatShortcut", () => {
  it("writes Mac symbols in Apple order", () => {
    expect(formatShortcut("Mod+Shift+O", true)).toBe("⇧⌘O");
    expect(formatShortcut("Mod+Alt+1", true)).toBe("⌥⌘1");
    expect(formatShortcut("Mod+Enter", true)).toBe("⌘↩");
    expect(formatShortcut("Shift+F5", true)).toBe("⇧F5");
  });
  it("spells keys out elsewhere", () => {
    expect(formatShortcut("Mod+Shift+O", false)).toBe("Ctrl+Shift+O");
    expect(formatShortcut("F5", false)).toBe("F5");
  });
});

describe("tidy", () => {
  it("drops empty submenus and stray separators", () => {
    const run = () => {};
    expect(
      tidy([
        "separator",
        false,
        { id: "a", label: "A", run },
        "separator",
        "separator",
        { id: "s", label: "S", items: [] },
        "separator",
      ]),
    ).toEqual([{ id: "a", label: "A", run }]);
  });
});
