import type { IFolderItem, IMenuAction } from "@shared-types";
import {
  Copy,
  Download,
  Edit,
  EllipsisVertical,
  FolderOpen,
  Share,
  Trash,
} from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { FolderIcon } from "@/lib/folder-icons";
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
  generateFolderUrl?: (folderName: string) => string;
  enableContextMenu?: boolean;
  enableDropdownMenu?: boolean;
  showViewMoreButton?: boolean;
  // Action enablers
  enableRename?: boolean;
  enableShare?: boolean;
  enableCopy?: boolean;
  enableDownload?: boolean;
  enableDelete?: boolean;
}

export function FoldersView({
  showHeadline,
  headlineText,
  initialFolderCount = 3,
  folders,
  openInNew,
  isLoading,
  onFolderOpen,
  generateFolderUrl = (name: string) => `/folder/${name}`,
  enableContextMenu = true,
  enableDropdownMenu = true,
  showViewMoreButton = true,
  enableRename = true,
  enableShare = true,
  enableCopy = true,
  enableDownload = true,
  enableDelete = true,
}: IFolderViewProps) {
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
  const { updateFolder } = useCloudStore();

  const displayFolders = folders.slice(0, initialFolderCount);
  const hasMoreFolders = folders.length > initialFolderCount;

  // Define menu actions internally
  const menuActions: IFolderMenuAction[] = [
    ...(enableRename
      ? [
          {
            id: "rename",
            label: "Rename",
            icon: Edit,
            onClick: (folder: IFolderItem) => {
              setRenameDialog({ open: true, folder });
            },
          },
        ]
      : []),
    ...(enableShare
      ? [
          {
            id: "share",
            label: "Share",
            icon: Share,
            separator: "before" as const,
            onClick: (folder: IFolderItem) => {
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                navigator.clipboard
                  .writeText(
                    `${window.location.origin}/folder/${folder.id}/share`,
                  )
                  .then(() =>
                    alert(`Share link for ${folder.name} copied to clipboard!`),
                  )
                  .catch(() => alert("Failed to copy share link"));
              } else {
                alert("Clipboard not supported");
              }
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
            onClick: (_folder: IFolderItem) => {
              // TODO: Implement copy functionality
            },
          },
        ]
      : []),
    ...(enableDownload
      ? [
          {
            id: "download",
            label: "Download",
            icon: Download,
            onClick: (folder: IFolderItem) => {
              window.open(`/api/folders/${folder.id}/download`, "_blank");
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
              fetch(`/api/folders/${folder.id}`, { method: "DELETE" })
                .then(() => {
                  alert(`${folder.name} has been deleted`);
                  window.location.reload();
                })
                .catch(() => alert("Failed to delete folder"));
            },
          },
        ]
      : []),
  ];

  const handleFolderOpen = (folder: IFolderItem, event?: React.MouseEvent) => {
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

  const handleDeleteConfirm = () => {
    if (deleteDialog.folder && deleteDialog.action) {
      deleteDialog.action.onClick(deleteDialog.folder);
      setDeleteDialog({ open: false });
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

  const handleMenuClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
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
          <action.icon className="mr-2 h-4 w-4" />
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
    const isFolderProcessing = isProcessing.has(folder.id);
    const folderElement = (
      <div
        aria-label={`Open folder ${folder.name} containing ${folder.meta.fileCount} files`}
        aria-describedby={`folder-${folder.id}-description`}
        className={`group cursor-pointer ${isFolderProcessing ? "opacity-50 pointer-events-none" : ""}`}
        onClick={(e) => handleFolderOpen(folder, e)}
      >
        <div className="flex items-center px-2 py-2 md:px-4 md:pr-1 md:p-2 border border-border space-between bg-card dark:bg-card w-full rounded-md group-hover:rounded-xl transition-all group-hover:bg-muted dark:group-hover:bg-muted">
          <div className="mr-4">
            <FolderIcon
              folder={folder}
              className="w-6 h-6"
              aria-hidden="true"
            />
          </div>
          <div className="w-full relative overflow-hidden">
            <h3 className="whitespace-nowrap text-ellipsis font-semibold">
              {folder.name}
            </h3>
            <p className="whitespace-nowrap text-ellipsis text-sm text-muted-foreground capitalize">
              {folder.category} · {folder.meta.fileCount} Files
            </p>
          </div>
          {enableDropdownMenu && menuActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={"ghost"}
                  className="hidden md:flex group-hover:opacity-100 opacity-0 transition-all duration-150 rounded-full p-0 m-0"
                  size={"icon"}
                  onClick={handleMenuClick}
                >
                  <EllipsisVertical className="p-0 m-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => handleFolderOpen(folder, e)}>
                  <FolderIcon folder={folder} className="mr-2 h-4 w-4" />
                  Open
                </DropdownMenuItem>
                {menuActions.length > 0 && <DropdownMenuSeparator />}
                {renderMenuItems(folder, false)}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );

    if (enableContextMenu) {
      return (
        <ContextMenu key={folder.id}>
          <ContextMenuTrigger asChild>{folderElement}</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={(e) => handleFolderOpen(folder, e)}>
              <FolderIcon folder={folder} className="mr-2 h-4 w-4" />
              Open
            </ContextMenuItem>
            {menuActions.length > 0 && <ContextMenuSeparator />}
            {renderMenuItems(folder, true)}
          </ContextMenuContent>
        </ContextMenu>
      );
    }

    return <div key={folder.id}>{folderElement}</div>;
  };

  const FolderSkeleton = () => (
    <div className="flex items-center px-2 py-2 md:px-4 md:pr-1 md:p-2 border border-border bg-card dark:bg-card w-full rounded-md">
      <div className="mr-4">
        <Skeleton className="w-6 h-6 rounded" />
      </div>
      <div className="w-full relative overflow-hidden">
        <Skeleton className="h-4 w-20 mb-1 rounded" />
        <Skeleton className="h-3 w-16 rounded" />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div>
        {/* Header with title - always visible during loading */}
        <div className="flex items-center justify-between mb-4">
          {showHeadline && (
            <h2 className="text-lg font-semibold">{headlineText}</h2>
          )}
          {showViewMoreButton && <Skeleton className="h-8 w-20 rounded-full" />}
        </div>

        {/* Skeleton folder grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
          {Array.from({ length: initialFolderCount }, (_, i) => (
            <FolderSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!folders.length) {
    return (
      <div>
        {showHeadline && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{headlineText}</h2>
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-border rounded-lg bg-card">
          <div className="mb-6 p-4 rounded-2xl bg-muted dark:bg-muted/50">
            <FolderOpen className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No folders yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Create your first folder to organize your documents
          </p>
          <Button asChild size="lg">
            <a href="/folder/new">Create Folder</a>
          </Button>
        </div>
      </div>
    );
  }

  // Find destructive action for delete dialog
  const _destructiveAction = deleteDialog.action;
  const hasDestructiveActions = enableDelete;

  return (
    <Fragment>
      <div>
        {/* Header with title and view more button */}
        <div className="flex items-center justify-between mb-4">
          {showHeadline && (
            <h2 className="text-lg font-semibold">{headlineText}</h2>
          )}
          {showViewMoreButton && hasMoreFolders && (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary font-medium hover:text-teal-700 transition-colors rounded-full"
              onClick={() => (window.location.href = "/vault")}
            >
              View More
            </Button>
          )}
        </div>

        {/* Show display folders */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
          {displayFolders.map(renderFolderItem)}
        </div>
      </div>

      {hasDestructiveActions && (
        <DeleteConfirmationDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ open })}
          itemName={deleteDialog.folder?.name || ""}
          itemType="folder"
          onConfirm={handleDeleteConfirm}
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
    </Fragment>
  );
}
