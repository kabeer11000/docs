"use client";

import { useStore } from "@nanostores/react";
import { useRouter } from "next/navigation";
import {
  type DragEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useImportFiles } from "@/lib/import/use-import-files";
import { cn } from "@/lib/utils";
import {
  $anchor,
  $fresh,
  $renaming,
  $selection,
  type ItemRef,
  isOwned,
  itemHref,
  moveTo,
  refFor,
  rename,
  select,
  toggleSelected,
} from "@/state/file-actions";
import { rangeIds } from "@/state/file-logic";

/** Drag payload for files and folders moved inside the app. */
export const ITEMS_MIME = "application/x-docs-items";

/** Every file and folder on screen, in reading order (the order ranges and arrow keys use). */
export function itemElements(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-item-id]"));
}

export const domOrder = () => [
  ...new Set(itemElements().map((el) => el.dataset.itemId as string)),
];

const fromInside = (e: { target: EventTarget; currentTarget: EventTarget }) => {
  const hit = (e.target as HTMLElement).closest(
    "button, a, input, [role=menuitem]",
  );
  return (
    !!hit &&
    hit !== e.currentTarget &&
    (e.currentTarget as HTMLElement).contains(hit)
  );
};

/**
 * Behaviour shared by every file/folder card and row: click selects (Cmd/Ctrl toggles, Shift ranges),
 * double-click opens, a tap opens on touch (or toggles once something is selected), and owned items drag.
 */
export function useFileItem(item: ItemRef) {
  const router = useRouter();
  const selected = useStore($selection).includes(item.id);
  const fresh = useStore($fresh).includes(item.id);
  // Not draggable while its name is being edited, so selecting text in the field does not start a drag.
  const renaming = useStore($renaming) === item.id;
  const owned = isOwned(item) && !renaming;
  const open = () => router.push(itemHref(item));

  const onClick = (e: MouseEvent<HTMLElement>) => {
    if (fromInside(e)) return;
    const type = (e.nativeEvent as PointerEvent).pointerType;
    const touch =
      type === "touch" || (!type && window.matchMedia("(hover: none)").matches);
    if (e.shiftKey)
      select(
        rangeIds(domOrder(), $anchor.get(), item.id),
        $anchor.get() ?? item.id,
      );
    else if (e.metaKey || e.ctrlKey) toggleSelected(item.id);
    else if (touch) $selection.get().length ? toggleSelected(item.id) : open();
    else select([item.id]);
  };

  const onDragStart = (e: DragEvent<HTMLElement>) => {
    const sel = $selection.get();
    const ids = sel.includes(item.id) ? sel : [item.id];
    if (!sel.includes(item.id)) select([item.id]);
    e.dataTransfer.setData(ITEMS_MIME, JSON.stringify(ids.map(refFor)));
    e.dataTransfer.effectAllowed = "move";
  };

  return {
    selected,
    fresh,
    open,
    props: {
      "data-item-id": item.id,
      "data-item-type": item.type,
      "data-selected": selected || undefined,
      "aria-selected": selected,
      tabIndex: 0,
      draggable: owned,
      onClick,
      onDoubleClick: (e: MouseEvent<HTMLElement>) => !fromInside(e) && open(),
      onDragStart: owned ? onDragStart : undefined,
    },
  };
}

/** Ring classes for selected / just created / drop target states (keyboard focus ring stays separate). */
export const itemStateClass = (s: {
  selected?: boolean;
  fresh?: boolean;
  over?: boolean;
}) =>
  cn(
    s.selected && "ring-2 ring-foreground/80",
    !s.selected && s.fresh && "ring-2 ring-highlight",
    s.over && "bg-accent ring-2 ring-foreground/40",
  );

const accepts = (e: DragEvent) => {
  const types = Array.from(e.dataTransfer.types);
  return types.includes(ITEMS_MIME) || types.includes("Files");
};

/** Drop target for a folder (card or breadcrumb): app items move into it, desktop files import into it. */
export function useFolderDrop(folderId: string | undefined) {
  const [over, setOver] = useState(false);
  const { importFiles } = useImportFiles();
  const depth = useRef(0);
  if (!folderId) return { over: false, dropProps: {} };

  return {
    over,
    dropProps: {
      onDragEnter: (e: DragEvent) => {
        if (!accepts(e)) return;
        e.preventDefault();
        depth.current += 1;
        setOver(true);
      },
      onDragOver: (e: DragEvent) => {
        if (!accepts(e)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = e.dataTransfer.types.includes("Files")
          ? "copy"
          : "move";
      },
      onDragLeave: (e: DragEvent) => {
        if (!accepts(e)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setOver(false);
      },
      onDrop: (e: DragEvent) => {
        if (!accepts(e)) return;
        e.preventDefault();
        // The page-wide import drop would otherwise import into the root as well.
        e.stopPropagation();
        depth.current = 0;
        setOver(false);
        const raw = e.dataTransfer.getData(ITEMS_MIME);
        if (raw) {
          try {
            moveTo(JSON.parse(raw) as ItemRef[], folderId);
          } catch {
            /* foreign payload */
          }
        } else if (e.dataTransfer.files.length) {
          importFiles(e.dataTransfer.files, folderId);
        }
      },
    },
  };
}

/**
 * A file or folder name that turns into an input for inline rename (double-click the name, F2, or the menu).
 * Enter or blur saves, Esc cancels.
 */
export function ItemName({
  item,
  name,
  className,
}: {
  item: ItemRef;
  name: string;
  className?: string;
}) {
  const editing = useStore($renaming) === item.id;
  const input = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!editing) return;
    done.current = false;
    const el = input.current;
    el?.focus();
    el?.select();
  }, [editing]);

  if (!editing) {
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: double-click is a shortcut; F2 and the menu are the accessible paths
      <span
        className={cn("block truncate", className)}
        title={name}
        onDoubleClick={(e) => {
          if (!isOwned(item)) return;
          e.stopPropagation();
          $renaming.set(item.id);
        }}
      >
        {name || "Untitled"}
      </span>
    );
  }

  const finish = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    const value = input.current?.value ?? "";
    $renaming.set(null);
    if (save) rename(item, value);
    // Hand focus back to the card so keyboard navigation continues from it.
    document
      .querySelector<HTMLElement>(`[data-item-id="${CSS.escape(item.id)}"]`)
      ?.focus();
  };

  return (
    <input
      ref={input}
      defaultValue={name}
      aria-label="Name"
      className={cn(
        "-mx-1 block w-[calc(100%+0.5rem)] min-w-0 rounded-[6px] bg-card px-1 outline-none ring-2 ring-ring",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") finish(true);
        if (e.key === "Escape") finish(false);
      }}
      onBlur={() => finish(true)}
    />
  );
}
