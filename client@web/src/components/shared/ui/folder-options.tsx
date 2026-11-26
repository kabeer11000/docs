"use client";

import { Edit, MoreHorizontal, Star } from "lucide-react";
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
        const query = cloudStore.query.where("id", "EQUAL", folderId).limit(1);
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

      await foldersCollection.update(cloudStore.query.where('id', 'EQUAL', folderId), {
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

      await foldersCollection.update(cloudStore.query.where('id', 'EQUAL', folderId), {
        name: newName,
      });

      setFolderName(newName);
      showToast.success(`Folder renamed to "${newName}"`);
    } catch (error) {
      console.error("Failed to rename folder:", error);
      showToast.error("Failed to rename folder");
    } finally {
      setRenameOpen(false);
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <MoreHorizontal />
            Options
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setRenameOpen(true)} disabled={isLoading}>
            <Edit />
            Rename
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleStar} disabled={isLoading}>
            <Star className={isStarred ? "fill-current" : undefined} />
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
