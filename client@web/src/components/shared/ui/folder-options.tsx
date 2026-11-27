"use client";

import { useStore } from "@nanostores/react";
import {
  FolderInput,
  MoreHorizontal,
  Pencil,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { openAfterMenuClose } from "@/components/shared/overlay";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { $folders } from "@/state/cloudstore-data";
import {
  $moveRefs,
  $renaming,
  type ItemRef,
  setStarred,
  trash,
} from "@/state/file-actions";
import { parentOf } from "@/state/file-logic";

interface FolderOptionsProps {
  folderId?: string;
}

/** Options for the open folder, same actions and order as the file menu. */
export function FolderOptions({ folderId }: FolderOptionsProps) {
  const router = useRouter();
  const folder = useStore($folders).find((f) => f.id === folderId);
  if (!folderId || !folder) return null;
  const ref: ItemRef = { id: folderId, type: "folder" };
  const starred = !!folder.isStarred;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <MoreHorizontal />
          Options
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-52 [&_[role=menuitem]]:h-8 [&_svg]:size-3.5"
      >
        <DropdownMenuItem
          onSelect={() => openAfterMenuClose(() => $renaming.set(folderId))}
        >
          <Pencil />
          Rename
          <DropdownMenuShortcut>F2</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setStarred([ref], !starred)}>
          {starred ? <StarOff /> : <Star />}
          {starred ? "Remove from Starred" : "Add to Starred"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => openAfterMenuClose(() => $moveRefs.set([ref]))}
        >
          <FolderInput />
          Move to
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => {
            const parent = parentOf(folder);
            trash([ref]);
            router.push(
              parent && parent !== folder.permissions.owner
                ? `/folder/${parent}`
                : "/vault",
            );
          }}
        >
          <Trash2 className="text-destructive" />
          Move to Trash
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
