"use client";

import { useStore } from "@nanostores/react";
import { formatDistanceToNow } from "date-fns";
import { Folder, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { openAfterMenuClose } from "@/components/shared/overlay";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { $auth } from "@/state/auth";
import { $patches } from "@/state/cloudstore-data";
import {
  deleteForever,
  folderName,
  type ItemRef,
  restore,
} from "@/state/file-actions";
import {
  applyPatches,
  expiredTrash,
  isTrashed,
  TRASH_DAYS,
} from "@/state/file-logic";
import { $nothing, type TrashedRow, trashedWatch } from "@/state/live-queries";
import { EmptyState } from "./empty-state";
import { KindIcon } from "./kind";

type Item = TrashedRow & ItemRef;

/** Everything in Trash: restore, delete forever (confirmed), empty. Items past 30 days go when this opens. */
export function TrashView() {
  const { user } = useStore($auth);
  const docs = useStore(user ? trashedWatch(user.id, "documents") : $nothing);
  const folders = useStore(user ? trashedWatch(user.id, "folders") : $nothing);
  const patches = useStore($patches);
  const [confirm, setConfirm] = useState<{
    items: Item[];
    title: string;
    description: string;
  } | null>(null);
  const loading = docs === undefined || folders === undefined;

  const items = useMemo<Item[]>(() => {
    const all = [
      ...(folders ?? []).map((f) => ({ ...f, type: "folder" as const })),
      ...(docs ?? []).map((d) => ({ ...d, type: "file" as const })),
    ];
    return applyPatches(all, patches)
      .filter(isTrashed)
      .sort((a, b) => b.trashedAt.localeCompare(a.trashedAt));
  }, [docs, folders, patches]);

  // Client-side retention: anything trashed more than 30 days ago is deleted when Trash opens.
  // ponytail: runs only when someone opens Trash; a scheduled server job would make it exact.
  const purged = useRef(false);
  useEffect(() => {
    if (loading || purged.current) return;
    purged.current = true;
    const old = expiredTrash(items);
    if (old.length) deleteForever(old, { quiet: true });
  }, [loading, items]);

  const askDelete = (list: Item[]) =>
    setConfirm({
      items: list,
      title:
        list.length === 1
          ? "Delete forever?"
          : `Delete ${list.length} items forever?`,
      description:
        list.length === 1
          ? `"${list[0].title || list[0].name || "Untitled"}" will be deleted for good. This cannot be undone.`
          : "These items will be deleted for good. This cannot be undone.",
    });

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 rounded-[14px] bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex min-h-8 items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Items in Trash are deleted forever after {TRASH_DAYS} days.
        </p>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() =>
              setConfirm({
                items,
                title: "Empty Trash?",
                description: `All ${items.length} ${items.length === 1 ? "item" : "items"} in Trash will be deleted for good. This cannot be undone.`,
              })
            }
          >
            <Trash2 />
            Empty Trash
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Trash is empty"
          description={`Files you delete wait here for ${TRASH_DAYS} days, so you can change your mind.`}
        />
      ) : (
        <ul className="overflow-hidden rounded-[14px] bg-card px-1 shadow-card">
          {items.map((item) => (
            <TrashRow
              key={item.id}
              item={item}
              onDelete={() => askDelete([item])}
            />
          ))}
        </ul>
      )}

      <ConfirmationDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        confirmText="Delete forever"
        variant="destructive"
        onConfirm={() => confirm && deleteForever(confirm.items)}
      />
    </>
  );
}

function TrashRow({ item, onDelete }: { item: Item; onDelete: () => void }) {
  const name = item.title || item.name || "Untitled";
  const back = () =>
    restore([{ id: item.id, type: item.type, parent: item.trashedFrom }]);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <li className="group flex h-12 items-center gap-2 border-b border-border/60 pr-1 pl-3 last:border-0 hover:bg-accent/60">
          {item.type === "folder" ? (
            <span className="flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-muted text-foreground/70">
              <Folder className="size-3.5" aria-hidden="true" />
            </span>
          ) : (
            <KindIcon kind={item.kind ?? "doc"} />
          )}
          <span
            className="min-w-0 flex-1 truncate font-display text-[14px] font-semibold tracking-[-0.01em]"
            title={name}
          >
            {name}
          </span>
          <span className="hidden w-40 truncate text-xs text-muted-foreground md:block">
            {item.trashedFrom ? `From ${folderName(item.trashedFrom)}` : ""}
          </span>
          <span className="hidden w-36 truncate text-xs text-muted-foreground sm:block">
            Trashed{" "}
            {formatDistanceToNow(new Date(item.trashedAt), { addSuffix: true })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={back}
            aria-label={`Restore ${name}`}
          >
            <RotateCcw />
            <span className="hidden sm:inline">Restore</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            aria-label={`Delete ${name} forever`}
            title="Delete forever"
          >
            <Trash2 />
          </Button>
        </li>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-48">
        <ContextMenuItem className="h-8 [&_svg]:size-3.5" onSelect={back}>
          <RotateCcw />
          Restore
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="h-8 text-destructive focus:text-destructive [&_svg]:size-3.5"
          onSelect={() => openAfterMenuClose(onDelete)}
        >
          <Trash2 className="text-destructive" />
          Delete forever
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
