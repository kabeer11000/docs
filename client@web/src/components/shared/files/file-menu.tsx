"use client";

import {
  CheckSquare,
  Copy,
  Download,
  ExternalLink,
  FolderInput,
  type LucideIcon,
  PanelTop,
  Pencil,
  Share2,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { ItemMenu } from "@/components/home/item-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  $moveRefs,
  $renaming,
  $selection,
  $shareId,
  allStarred,
  canDownload,
  download,
  duplicate,
  type ItemRef,
  isOwned,
  itemHref,
  refFor,
  select,
  setStarred,
  toggleSelected,
  trash,
} from "@/state/file-actions";
import { openAfterMenuClose } from "../overlay";

type Entry = {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  destructive?: boolean;
  run: () => void;
};

/** What a menu opened on `item` acts on: the whole selection when the item is part of it. */
const targetsFor = (item: ItemRef): ItemRef[] => {
  const sel = $selection.get();
  return sel.length > 1 && sel.includes(item.id) ? sel.map(refFor) : [item];
};

const isTouch = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches;

/** One menu for files and folders everywhere, in one order: open, organise, share, trash. */
function useEntries(item: ItemRef): Entry[][] {
  const router = useRouter();
  const targets = targetsFor(item);
  const multi = targets.length > 1;
  const owned = targets.every(isOwned);
  const starred = allStarred(targets);
  const isFile = item.type === "file";

  const select_: Entry[] = isTouch()
    ? [
        {
          id: "select",
          label: "Select",
          icon: CheckSquare,
          run: () => toggleSelected(item.id),
        },
      ]
    : [];
  const open: Entry[] = multi
    ? []
    : [
        {
          id: "open",
          label: "Open",
          icon: ExternalLink,
          shortcut: "Enter",
          run: () => router.push(itemHref(item)),
        },
        {
          id: "tab",
          label: "Open in new tab",
          icon: PanelTop,
          run: () => window.open(itemHref(item), "_blank"),
        },
      ];
  const organise: Entry[] = owned
    ? [
        ...(multi
          ? []
          : [
              {
                id: "rename",
                label: "Rename",
                icon: Pencil,
                shortcut: "F2",
                run: () => openAfterMenuClose(() => $renaming.set(item.id)),
              },
            ]),
        {
          id: "star",
          label: starred ? "Remove from Starred" : "Add to Starred",
          icon: starred ? StarOff : Star,
          shortcut: "S",
          run: () => setStarred(targets, !starred),
        },
        ...(isFile && !multi
          ? [
              {
                id: "copy",
                label: "Make a copy",
                icon: Copy,
                run: () => duplicate(item),
              },
            ]
          : []),
        {
          id: "move",
          label: "Move to",
          icon: FolderInput,
          shortcut: "M",
          run: () => openAfterMenuClose(() => $moveRefs.set(targets)),
        },
      ]
    : [];
  const share: Entry[] = multi
    ? []
    : [
        ...(isFile && owned
          ? [
              {
                id: "share",
                label: "Share",
                icon: Share2,
                run: () => openAfterMenuClose(() => $shareId.set(item.id)),
              },
            ]
          : []),
        ...(canDownload(item)
          ? [
              {
                id: "download",
                label: "Download",
                icon: Download,
                run: () => download(item),
              },
            ]
          : []),
      ];
  const remove: Entry[] = owned
    ? [
        {
          id: "trash",
          label: multi
            ? `Move ${targets.length} items to Trash`
            : "Move to Trash",
          icon: Trash2,
          shortcut: "Del",
          destructive: true,
          run: () => trash(targets),
        },
      ]
    : [];
  return [select_, open, organise, share, remove].filter((g) => g.length);
}

type Kit = {
  Item: typeof ContextMenuItem | typeof DropdownMenuItem;
  Separator: typeof ContextMenuSeparator | typeof DropdownMenuSeparator;
  Shortcut: typeof ContextMenuShortcut | typeof DropdownMenuShortcut;
};
const CONTEXT: Kit = {
  Item: ContextMenuItem,
  Separator: ContextMenuSeparator,
  Shortcut: ContextMenuShortcut,
};
const DROPDOWN: Kit = {
  Item: DropdownMenuItem,
  Separator: DropdownMenuSeparator,
  Shortcut: DropdownMenuShortcut,
};

function MenuEntries({ item, kit }: { item: ItemRef; kit: Kit }) {
  const groups = useEntries(item);
  const { Item, Separator, Shortcut } = kit;
  return groups.map((group, g) => (
    <Fragment key={group[0].id}>
      {g > 0 && <Separator />}
      {group.map((e) => (
        <Item
          key={e.id}
          onSelect={e.run}
          className={cn(
            "h-8 [&_svg]:size-3.5",
            e.destructive && "text-destructive focus:text-destructive",
          )}
        >
          <e.icon className={e.destructive ? "text-destructive" : undefined} />
          {e.label}
          {e.shortcut && <Shortcut>{e.shortcut}</Shortcut>}
        </Item>
      ))}
    </Fragment>
  ));
}

/** Right-click (or long-press) menu for a file or folder. Right-clicking an unselected item selects it. */
export function FileContextMenu({
  item,
  children,
}: {
  item: ItemRef;
  children: ReactNode;
}) {
  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (open && !$selection.get().includes(item.id)) select([item.id]);
      }}
    >
      {/* Stops the empty-space menu around the list from opening too (right-click and touch long-press). */}
      <ContextMenuTrigger
        asChild
        onContextMenu={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.pointerType !== "mouse" && e.stopPropagation()}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-56">
        <MenuEntries item={item} kit={CONTEXT} />
      </ContextMenuContent>
    </ContextMenu>
  );
}

/** The "..." button on cards and rows, same entries as the context menu. */
export function FileDropdown({
  item,
  label,
  alwaysVisible,
}: {
  item: ItemRef;
  label: string;
  alwaysVisible?: boolean;
}) {
  return (
    <ItemMenu label={label} alwaysVisible={alwaysVisible}>
      <MenuEntries item={item} kit={DROPDOWN} />
    </ItemMenu>
  );
}
