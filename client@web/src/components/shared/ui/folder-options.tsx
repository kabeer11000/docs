"use client";

import { Edit, MoreVertical, Star } from "lucide-react";
import { useEffect, useState } from "react";
import cloudStore from "@/lib/cloudstore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RenameDialog } from "@/components/ui/confirmation-dialog";
import { showToast } from "@/lib/toast";

interface FolderOptionsProps {
  folderId?: string;
}

export function FolderOptions({ folderId }: FolderOptionsProps) {
  const [isStarred, setIsStarred] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [folderName, setFolderName] = useState("Folder");
  const [isLoading, setIsLoading] = useState(false);

  // Load initial folder data
  useEffect(() => {
    if (!folderId || !cloudStore) return;

    const loadFolderData = async () => {
      try {
        const foldersCollection = cloudStore.collection("folders");
        const query = cloudStore.query.where("_id", "EQUAL", folderId).limit(1);
        const result = (await foldersCollection.get(query)) as any[];

        if (result && result.length > 0) {
          const folder = result[0];
          setFolderName(folder.name || "Folder");
          setIsStarred(folder.isStarred || folder.starred || false);
        }
      } catch (error) {
        console.error("Failed to load folder:", error);
      }
    };

    loadFolderData();
  }, [folderId]);

  const handleStar = async () => {
    if (!folderId || !cloudStore || isLoading) return;

    setIsLoading(true);
    try {
      const foldersCollection = cloudStore.collection("folders");
      const newStarredStatus = !isStarred;

      await foldersCollection.update(folderId, {
        isStarred: newStarredStatus,
      });

      setIsStarred(newStarredStatus);
      showToast.success(newStarredStatus ? "Added to starred" : "Removed from starred");
    } catch (error) {
      console.error("Failed to update star status:", error);
      showToast.error("Failed to update star status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRename = async (newName: string) => {
    if (!folderId || !cloudStore || isLoading) return;

    setIsLoading(true);
    try {
      const foldersCollection = cloudStore.collection("folders");

      await foldersCollection.update(folderId, {
        name: newName,
      });

      setFolderName(newName);
      showToast.success(`Folder renamed to "${newName}"`);
    } catch (error) {
      console.error("Failed to rename folder:", error);
      showToast.error("Failed to rename folder");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="py-4 inline-flex items-center justify-center duration-150 gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 h-10 px-6 has-[>svg]:px-4 rounded-full border"
          >
            <MoreVertical className="w-4 h-4" />
            <span className="hidden sm:inline">Options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setRenameOpen(true)} disabled={isLoading}>
            <Edit className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleStar} disabled={isLoading}>
            <Star className={`mr-2 h-4 w-4 ${isStarred ? "fill-primary" : ""}`} />
            {isStarred ? "Unstar" : "Star"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        itemName={folderName}
        itemType="folder"
        onConfirm={handleRename}
        isLoading={isLoading}
      />
    </>
  );
}
