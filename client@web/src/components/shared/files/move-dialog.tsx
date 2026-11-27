"use client";

import { useStore } from "@nanostores/react";
import { Folder, FolderLock, FolderPlus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { $auth } from "@/state/auth";
import { $folders } from "@/state/cloudstore-data";
import { $moveRefs, insertFolder, moveTo } from "@/state/file-actions";
import { flattenTree, withDescendants } from "@/state/file-logic";

/** "Move to": the folder tree with search, and a new folder made in place. */
export function MoveDialog() {
  const refs = useStore($moveRefs);
  const { user } = useStore($auth);
  const folders = useStore($folders);
  const root = user?.id ?? "";
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState(root);
  const [naming, setNaming] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset each time the dialog opens
  useEffect(() => {
    setQuery("");
    setNaming(false);
    setTarget(root);
  }, [refs]);

  const blocked = useMemo(
    () =>
      withDescendants(
        folders,
        (refs ?? []).filter((r) => r.type === "folder").map((r) => r.id),
      ),
    [folders, refs],
  );
  const rows = useMemo(() => {
    const tree = flattenTree(folders, root);
    const q = query.trim().toLowerCase();
    return q
      ? tree
          .filter((r) => r.folder.name.toLowerCase().includes(q))
          .map((r) => ({ ...r, depth: 0 }))
      : tree;
  }, [folders, root, query]);

  if (!refs) return null;
  const close = () => $moveRefs.set(null);
  const count = refs.length;

  const createFolder = async (name: string) => {
    setNaming(false);
    const id = await insertFolder(
      target,
      name.trim() || "Untitled folder",
    ).catch(() => null);
    if (id) setTarget(id);
  };

  const option = (
    id: string,
    label: string,
    depth: number,
    icon: typeof Folder,
  ) => {
    const Icon = icon;
    const disabled = blocked.has(id);
    return (
      <button
        key={id}
        type="button"
        role="option"
        aria-selected={target === id}
        disabled={disabled}
        onClick={() => setTarget(id)}
        onDoubleClick={() => {
          moveTo(refs, id);
          close();
        }}
        style={{ paddingLeft: 8 + depth * 16 }}
        className={cn(
          "flex h-8 w-full items-center gap-2 rounded-[8px] pr-2 text-left text-sm transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
          target === id && "bg-accent font-medium",
        )}
      >
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate" title={label}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="gap-3 rounded-[14px] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {count === 1 ? "Move to" : `Move ${count} items to`}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Pick a folder
          </DialogDescription>
        </DialogHeader>
        <div className="flex h-9 items-center gap-2 rounded-[10px] bg-muted/70 px-3">
          <Search
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a folder"
            aria-label="Find a folder"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div
          role="listbox"
          aria-label="Folders"
          className="-mx-1 max-h-72 overflow-y-auto px-1"
        >
          {!query && option(root, "Vault", 0, FolderLock)}
          {rows.map((r) =>
            option(r.folder.id, r.folder.name, query ? 0 : r.depth + 1, Folder),
          )}
          {query && rows.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No folder called "{query}"
            </p>
          )}
          {naming && (
            <form
              className="flex h-8 items-center gap-2 pl-2"
              onSubmit={(e) => {
                e.preventDefault();
                createFolder(
                  new FormData(e.currentTarget).get("name") as string,
                );
              }}
            >
              <FolderPlus className="size-4 shrink-0 text-muted-foreground" />
              <input
                name="name"
                autoFocus
                placeholder="Folder name"
                aria-label="New folder name"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setNaming(false);
                  }
                }}
                onBlur={(e) =>
                  e.target.value.trim()
                    ? createFolder(e.target.value)
                    : setNaming(false)
                }
                className="h-7 min-w-0 flex-1 rounded-[6px] bg-card px-1.5 text-sm outline-none ring-2 ring-ring"
              />
            </form>
          )}
        </div>
        <DialogFooter className="flex-row items-center gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNaming(true)}
            disabled={naming || blocked.has(target)}
          >
            <FolderPlus />
            New folder
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={close}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={blocked.has(target)}
              onClick={() => {
                moveTo(refs, target);
                close();
              }}
            >
              Move here
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
