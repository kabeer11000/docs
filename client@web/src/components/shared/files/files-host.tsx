"use client";

import { useStore } from "@nanostores/react";
import {
  ArrowUpFromLine,
  FolderInput,
  FolderPlus,
  Star,
  StarOff,
  Trash2,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, type RefObject, useEffect, useRef } from "react";
import { KIND, KINDS } from "@/components/home/kind";
import { folderFromPath } from "@/components/home/navigation/new-menu";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateFile } from "@/hooks/use-create-file";
import { IMPORT_ACCEPT, useImportFiles } from "@/lib/import/use-import-files";
import { $auth } from "@/state/auth";
import { $documents } from "@/state/cloudstore-data";
import {
  $anchor,
  $moveRefs,
  $newMenuOpen,
  $renaming,
  $selection,
  $shareId,
  $shortcutsOpen,
  allStarred,
  clearSelection,
  isOwned,
  itemHref,
  newFolder,
  refFor,
  select,
  setStarred,
  toggleSelected,
  trash,
} from "@/state/file-actions";
import {
  boxBetween,
  intersects,
  type NavKey,
  nextIndex,
  rangeIds,
} from "@/state/file-logic";
import { searchActions } from "@/state/search";
import { undoLast } from "@/state/undo";
import { domOrder, itemElements } from "./file-item";
import { MoveDialog } from "./move-dialog";

// Loaded on first use; the share dialog is editor code most Home visits never need.
const ShareDialog = dynamic(() =>
  import("@/components/editor/share-dialog").then((m) => m.ShareDialog),
);

const NAV_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
]);
const FILE_PAGES = /^\/(home|vault|folder|shared)(\/|$)/;

const targets = () => {
  const sel = $selection.get();
  if (sel.length) return sel.map(refFor);
  const focused = (
    document.activeElement as HTMLElement | null
  )?.closest<HTMLElement>("[data-item-id]");
  return focused?.dataset.itemId ? [refFor(focused.dataset.itemId)] : [];
};

/** Keyboard model for file pages (arrows, Enter, Space, Shift ranges, Cmd+A, Delete, F2, Esc, /, c/n, ?, S, M, Cmd+Z). */
function useFileKeys(scroller: RefObject<HTMLElement | null>) {
  const router = useRouter();
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = !!t.closest?.(
        "input, textarea, select, [contenteditable=''], [contenteditable='true']",
      );
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.shiftKey && e.key.toLowerCase() === "z" && !typing) {
        if (undoLast()) e.preventDefault();
        return;
      }
      if (typing || e.defaultPrevented || e.altKey) return;
      // An open menu or dialog owns the keyboard.
      if (
        document.querySelector("[role=dialog], [role=alertdialog], [role=menu]")
      )
        return;

      const els = itemElements();
      const card = t.closest?.<HTMLElement>("[data-item-id]") ?? null;
      const onCard = !!card && card === t;
      const id = card?.dataset.itemId;
      const idle = t === document.body || t === scroller.current;

      if (NAV_KEYS.has(e.key) && !mod && els.length && (card || idle)) {
        if (!card && (e.key === "Home" || e.key === "End")) return;
        e.preventDefault();
        const next =
          els[
            card
              ? nextIndex(
                  els.map((el) => el.getBoundingClientRect()),
                  els.indexOf(card),
                  e.key as NavKey,
                )
              : 0
          ];
        next.focus();
        next.scrollIntoView({ block: "nearest" });
        const nextId = next.dataset.itemId as string;
        if (e.shiftKey) {
          const anchor = $anchor.get() ?? id ?? nextId;
          select(rangeIds(domOrder(), anchor, nextId), anchor);
        }
        return;
      }

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (mod) {
        if (key === "a" && els.length) {
          e.preventDefault();
          select(domOrder(), $anchor.get());
        }
        return;
      }
      const act = (fn: () => void) => {
        e.preventDefault();
        fn();
      };
      switch (key) {
        case "Enter":
          if (onCard && id) act(() => router.push(itemHref(refFor(id))));
          break;
        case " ":
          if (onCard && id) act(() => toggleSelected(id));
          break;
        case "Delete":
        case "Backspace":
          act(() => trash(targets()));
          break;
        case "F2": {
          const sel = $selection.get();
          const target = onCard ? id : sel.length === 1 ? sel[0] : undefined;
          if (target && isOwned(refFor(target)))
            act(() => $renaming.set(target));
          break;
        }
        case "Escape":
          if ($selection.get().length) act(clearSelection);
          break;
        case "/":
          act(searchActions.open);
          break;
        case "c":
        case "n":
          act(() => $newMenuOpen.set(true));
          break;
        case "?":
          act(() => $shortcutsOpen.set(true));
          break;
        case "s": {
          const refs = targets().filter(isOwned);
          if (refs.length) act(() => setStarred(refs, !allStarred(refs)));
          break;
        }
        case "m": {
          const refs = targets().filter(isOwned);
          if (refs.length) act(() => $moveRefs.set(refs));
          break;
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router, scroller]);
}

const NOT_EMPTY =
  "[data-item-id], a, button, input, textarea, select, label, [role=menu], [role=dialog], [contenteditable], [data-no-band]";

/** Click on empty space clears the selection; dragging from it draws a selection rectangle. */
function useRubberBand(scroller: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || e.pointerType !== "mouse") return;
      const target = e.target as HTMLElement;
      if (!scroller.current?.contains(target) || target.closest(NOT_EMPTY))
        return;
      const additive = e.shiftKey || e.metaKey || e.ctrlKey;
      const base = additive ? $selection.get() : [];
      const els = itemElements();
      const [x0, y0] = [e.clientX, e.clientY];
      let band: HTMLDivElement | null = null;

      const onMove = (ev: PointerEvent) => {
        if (!band) {
          if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 4) return;
          band = document.createElement("div");
          band.className =
            "pointer-events-none fixed z-40 rounded-[4px] border border-foreground/30 bg-foreground/[0.06]";
          document.body.append(band);
          document.body.style.userSelect = "none";
        }
        const box = boxBetween(x0, y0, ev.clientX, ev.clientY);
        Object.assign(band.style, {
          left: `${box.left}px`,
          top: `${box.top}px`,
          width: `${box.width}px`,
          height: `${box.height}px`,
        });
        const hit = els
          .filter((el) => intersects(box, el.getBoundingClientRect()))
          .map((el) => el.dataset.itemId as string);
        select([...new Set([...base, ...hit])], $anchor.get());
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        if (band) {
          band.remove();
          document.body.style.userSelect = "";
        } else if (!additive) {
          clearSelection();
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp, { once: true });
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [scroller]);
}

/** Floating bar for two or more selected items. */
function SelectionBar() {
  const selection = useStore($selection);
  if (selection.length < 2) return null;
  const refs = selection.map(refFor);
  const owned = refs.filter(isOwned);
  const starred = allStarred(owned);
  return (
    <div
      role="toolbar"
      aria-label={`${selection.length} selected`}
      data-no-band
      className="fixed bottom-6 left-1/2 z-40 flex h-11 -translate-x-1/2 items-center gap-1 rounded-full bg-popover px-1.5 text-sm shadow-float ring-1 ring-border animate-in fade-in slide-in-from-bottom-2"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-full"
        onClick={clearSelection}
        aria-label="Clear selection"
        title="Clear selection (Esc)"
      >
        <X />
      </Button>
      <span className="pr-2 pl-0.5 font-medium tabular-nums">
        {selection.length} selected
      </span>
      {owned.length > 0 && (
        <>
          <span className="h-5 w-px bg-border" aria-hidden="true" />
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => $moveRefs.set(owned)}
            title="Move to (M)"
          >
            <FolderInput />
            Move to
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => setStarred(owned, !starred)}
            title="Star (S)"
          >
            {starred ? <StarOff /> : <Star />}
            {starred ? "Unstar" : "Star"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => trash(owned)}
            title="Move to Trash (Delete)"
          >
            <Trash2 />
            Trash
          </Button>
        </>
      )}
    </div>
  );
}

function ShareHost() {
  const id = useStore($shareId);
  const docs = useStore($documents);
  const doc = id ? docs.find((d) => d.id === id) : undefined;
  if (!doc) return null;
  return (
    <ShareDialog
      open
      onOpenChange={(open) => !open && $shareId.set(null)}
      document={doc}
    />
  );
}

const SHORTCUTS: [string, string[]][] = [
  ["Move between files", ["Arrow keys"]],
  ["Open", ["Enter"]],
  ["Select", ["Click", "Space"]],
  ["Add to selection", ["Ctrl/Cmd Click"]],
  ["Select a range", ["Shift Click", "Shift Arrow"]],
  ["Select all", ["Ctrl/Cmd A"]],
  ["Clear selection", ["Esc"]],
  ["Rename", ["F2"]],
  ["Star", ["S"]],
  ["Move to", ["M"]],
  ["Move to Trash", ["Delete"]],
  ["Undo", ["Ctrl/Cmd Z"]],
  ["Search", ["/", "Ctrl/Cmd K"]],
  ["New", ["C", "N"]],
  ["Shortcuts", ["?"]],
];

function ShortcutsDialog() {
  const open = useStore($shortcutsOpen);
  return (
    <Dialog open={open} onOpenChange={$shortcutsOpen.set}>
      <DialogContent className="gap-3 rounded-[14px] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
          {SHORTCUTS.map(([label, keys]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="flex justify-end gap-1">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded-[6px] border border-border bg-muted/60 px-1.5 font-sans text-xs leading-5"
                  >
                    {k}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

/** Right-click on empty space of a file page: make something new here. */
function EmptySpaceMenu({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const { user } = useStore($auth);
  const { create } = useCreateFile();
  const { importFiles } = useImportFiles();
  const input = useRef<HTMLInputElement>(null);
  // Always rendered (disabled elsewhere) so the content below never remounts on navigation.
  const active = FILE_PAGES.test(pathname) && !!user;
  const parent = folderFromPath(pathname) || user?.id || "";
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild disabled={!active}>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="min-w-56">
          {KINDS.map((kind) => {
            const k = KIND[kind];
            return (
              <ContextMenuItem
                key={kind}
                className="h-8 [&_svg]:size-3.5"
                onSelect={() => create(kind, parent)}
              >
                <k.icon className={k.text} />
                New {k.label.toLowerCase()}
              </ContextMenuItem>
            );
          })}
          <ContextMenuItem
            className="h-8 [&_svg]:size-3.5"
            onSelect={() => newFolder(parent)}
          >
            <FolderPlus />
            New folder
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="h-8 [&_svg]:size-3.5"
            onSelect={() => input.current?.click()}
          >
            <ArrowUpFromLine />
            Import file
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <input
        ref={input}
        type="file"
        accept={IMPORT_ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) importFiles(e.target.files, parent);
          e.target.value = "";
        }}
      />
    </>
  );
}

/**
 * Everything file pages share, mounted once in the workspace shell: keyboard model, rubber-band selection,
 * the selection bar, Move to, Share, the shortcuts sheet and the empty-space menu around the content.
 */
export function FilesHost({
  scroller,
  children,
}: {
  scroller: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  useFileKeys(scroller);
  useRubberBand(scroller);

  // A new page is a new selection.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on route change by design
  useEffect(() => {
    clearSelection();
    $renaming.set(null);
  }, [pathname]);

  return (
    <>
      <EmptySpaceMenu>{children}</EmptySpaceMenu>
      <SelectionBar />
      <MoveDialog />
      <ShareHost />
      <ShortcutsDialog />
    </>
  );
}
