import type { IFolderItem, IMenuAction } from "@shared-types";
import { Copy, Edit, ExternalLink, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, type ReactNode, useState } from "react";
import { FolderTab } from "@/components/home/folder-tab";
import { ItemMenu } from "@/components/home/item-menu";
import { SectionHeader } from "@/components/home/section-header";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  DeleteConfirmationDialog,
  RenameDialog,
} from "@/components/ui/confirmation-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { Button } from "../../ui/button";

// Folder-specific menu action interface
export interface IFolderMenuAction extends IMenuAction {
  onClick: (folder: IFolderItem) => void;
}

export interface IFolderViewProps {
  showHeadline?: boolean;
  headlineText?: string | ReactNode;
  initialFolderCount?: number;
  folders: IFolderItem[];
  openInNew?: boolean;
  isLoading?: boolean;
  onFolderOpen?: (folder: IFolderItem) => void;
  onCreateFolder?: () => void | Promise<void>;
  generateFolderUrl?: (folderName: string) => string;
  enableContextMenu?: boolean;
  enableDropdownMenu?: boolean;
  showViewMoreButton?: boolean;
  collapsible?: boolean;
  // Action enablers
  enableOpen?: boolean;
  enableOpenNewTab?: boolean;
  enableRename?: boolean;
  enableCopy?: boolean;
  enableDelete?: boolean;
}

export function FoldersView({
  showHeadline,
  headlineText,
  initialFolderCount = 8,
  folders,
  openInNew,
  isLoading,
  onFolderOpen,
  generateFolderUrl = (name: string) => `/folder/${name}`,
  enableContextMenu = true,
  enableDropdownMenu = true,
  showViewMoreButton = true,
  collapsible = true,
  enableOpen = true,
  enableOpenNewTab = true,
  enableRename = true,
  enableCopy = true,
  enableDelete = true,
}: IFolderViewProps) {
  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    folder?: IFolderItem;
    action?: IMenuAction;
  }>({ open: false });
  const [renameDialog, setRenameDialog] = useState<{
    open: boolean;
    folder?: IFolderItem;
  }>({ open: false });
  const [isProcessing, setIsProcessing] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(true);
  const { deleteFolder, updateFolder, duplicateFolder } = useCloudStore();

  const displayFolders = folders.slice(0, initialFolderCount);
  const hasMoreFolders = folders.length > initialFolderCount;

  // Define menu actions internally
  const menuActions: IFolderMenuAction[] = [
    ...(enableOpen
      ? [
          {
            id: "open",
            label: "Open",
            icon: ExternalLink,
            onClick: (folder: IFolderItem) => {
              handleFolderOpen(folder);
            },
          },
        ]
      : []),
    ...(enableOpenNewTab
      ? [
          {
            id: "openInNewTab",
            label: "Open in new tab",
            icon: ExternalLink,
            onClick: (folder: IFolderItem) => {
              window.open(`/folder/${folder.id}`, "_blank");
            },
          },
        ]
      : []),
    ...(enableRename
      ? [
          {
            id: "rename",
            label: "Rename",
            icon: Edit,
            separator: "before" as const,
            onClick: (folder: IFolderItem) => {
              setRenameDialog({ open: true, folder });
            },
          },
        ]
      : []),
    ...(enableCopy
      ? [
          {
            id: "copy",
            label: "Make a copy",
            icon: Copy,
            onClick: async (folder: IFolderItem) => {
              setIsProcessing((prev) => new Set(prev).add(folder.id));
              try {
                const newId = await duplicateFolder(folder.id);

                if (newId) {
                  console.log("Folder copied successfully");
                } else {
                  alert(`Failed to copy ${folder.name}`);
                }
              } catch (error) {
                console.error("Copy error:", error);
                alert(`Failed to copy ${folder.name}`);
              } finally {
                setIsProcessing((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(folder.id);
                  return newSet;
                });
              }
            },
          },
        ]
      : []),
    ...(enableDelete
      ? [
          {
            id: "delete",
            label: "Delete",
            icon: Trash,
            variant: "destructive" as const,
            separator: "before" as const,
            onClick: (folder: IFolderItem) => {
              setDeleteDialog({ open: true, folder });
            },
          },
        ]
      : []),
  ];

  const handleFolderOpen = (folder: IFolderItem, event?: React.SyntheticEvent) => {
    event?.preventDefault();
    event?.stopPropagation();

    if (onFolderOpen) {
      onFolderOpen(folder);
    } else {
      window.open(
        generateFolderUrl(folder.name),
        openInNew ? "_blank" : "_self",
      );
    }
  };

  const handleMenuAction = (
    action: IFolderMenuAction,
    folder: IFolderItem,
    event?: React.MouseEvent,
  ) => {
    event?.preventDefault();
    event?.stopPropagation();

    if (action.variant === "destructive") {
      setDeleteDialog({ open: true, folder, action });
    } else {
      action.onClick(folder);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.folder) return;

    const folder = deleteDialog.folder;
    setIsProcessing((prev) => new Set(prev).add(folder.id));

    try {
      const success = await deleteFolder(folder.id);

      if (success) {
        console.log(`${folder.name} has been deleted`);
        setDeleteDialog({ open: false });
      } else {
        alert(`Failed to delete ${folder.name}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert(`Failed to delete ${folder.name}`);
    } finally {
      setIsProcessing((prev) => {
        const newSet = new Set(prev);
        newSet.delete(folder.id);
        return newSet;
      });
    }
  };

  const handleRename = async (newName: string) => {
    if (!renameDialog.folder) return;

    const folder = renameDialog.folder;
    setIsProcessing((prev) => new Set(prev).add(folder.id));

    try {
      const success = await updateFolder(folder.id, { name: newName });

      if (success) {
        setRenameDialog({ open: false });
      } else {
        alert("Failed to rename folder");
      }
    } catch (error) {
      console.error("Rename error:", error);
      alert("Failed to rename folder");
    } finally {
      setIsProcessing((prev) => {
        const newSet = new Set(prev);
        newSet.delete(folder.id);
        return newSet;
      });
    }
  };

  const renderMenuItems = (
    folder: IFolderItem,
    isContextMenu: boolean = false,
  ) => {
    const MenuItemComponent = isContextMenu
      ? ContextMenuItem
      : DropdownMenuItem;
    const SeparatorComponent = isContextMenu
      ? ContextMenuSeparator
      : DropdownMenuSeparator;

    return menuActions.map((action, _index) => (
      <Fragment key={action.id}>
        {action.separator === "before" || action.separator === "both" ? (
          <SeparatorComponent />
        ) : null}
        <MenuItemComponent
          onClick={(e) => handleMenuAction(action, folder, e)}
          className={
            action.variant === "destructive"
              ? "text-destructive focus:text-destructive"
              : ""
          }
        >
          <action.icon />
          {typeof action.label === "function"
            ? action.label(folder)
            : action.label}
        </MenuItemComponent>
        {action.separator === "after" || action.separator === "both" ? (
          <SeparatorComponent />
        ) : null}
      </Fragment>
    ));
  };

  const renderFolderItem = (folder: IFolderItem) => {
    const folderElement = (
      <FolderTab
        name={folder.name}
        fileCount={folder.meta?.fileCount || 0}
        onOpen={() => handleFolderOpen(folder)}
        disabled={isProcessing.has(folder.id)}
        actions={
          enableDropdownMenu &&
          menuActions.length > 0 && (
            <ItemMenu label={`More options for folder ${folder.name}`}>
              {renderMenuItems(folder, false)}
            </ItemMenu>
          )
        }
      />
    );

    if (enableContextMenu) {
      return (
        <ContextMenu key={folder.id}>
          <ContextMenuTrigger asChild>{folderElement}</ContextMenuTrigger>
          <ContextMenuContent>{renderMenuItems(folder, true)}</ContextMenuContent>
        </ContextMenu>
      );
    }

    return <div key={folder.id}>{folderElement}</div>;
  };

  // Nothing to show: hide the whole section instead of a second empty state.
  if (!isLoading && !folders.length) return null;

  const grid = (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {isLoading
        ? Array.from({ length: 4 }, (_, i) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
              key={i}
              className="h-12 rounded-[12px] bg-muted"
            />
          ))
        : displayFolders.map(renderFolderItem)}
    </div>
  );

  const viewMore = showViewMoreButton && hasMoreFolders && !isLoading && (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      onClick={() => router.push("/vault")}
    >
      View all
    </Button>
  );

  return (
    <Collapsible open={collapsible ? isOpen : true} onOpenChange={setIsOpen}>
      {showHeadline && (
        <SectionHeader
          title={headlineText}
          collapsible={collapsible}
          open={isOpen}
          actions={viewMore}
        />
      )}
      <CollapsibleContent>{grid}</CollapsibleContent>

      {enableDelete && (
        <DeleteConfirmationDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ open })}
          itemName={deleteDialog.folder?.name || ""}
          itemType="folder"
          onConfirm={handleDeleteConfirm}
          isLoading={
            deleteDialog.folder
              ? isProcessing.has(deleteDialog.folder.id)
              : false
          }
        />
      )}

      {enableRename && (
        <RenameDialog
          open={renameDialog.open}
          onOpenChange={(open) => setRenameDialog({ open })}
          itemName={renameDialog.folder?.name || ""}
          itemType="folder"
          onConfirm={handleRename}
          isLoading={
            renameDialog.folder
              ? isProcessing.has(renameDialog.folder.id)
              : false
          }
        />
      )}
    </Collapsible>
  );
}
