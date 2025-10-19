import type { IFolderItem, IMenuAction } from "@shared-types";
import {
  ChevronDown,
  Copy,
  Download,
  Edit,
  EllipsisVertical,
  ExternalLink,
  FolderOpen,
  Share,
  Trash,
} from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";
import { PiInfo } from "react-icons/pi";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
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
  initialFolderCount = 3,
  folders,
  openInNew,
  isLoading,
  onFolderOpen,
  onCreateFolder,
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
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
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

  const handleMenuClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleCreateFolder = async () => {
    if (!onCreateFolder) return;

    setIsCreatingFolder(true);
    try {
      await onCreateFolder();
    } catch (error) {
      console.error("Failed to create folder:", error);
    } finally {
      setIsCreatingFolder(false);
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
        role="button"
        tabIndex={0}
        aria-label={`Open folder ${folder.name} containing ${folder.meta.fileCount} files`}
        aria-describedby={`folder-${folder.id}-description`}
        className={`group cursor-pointer focus:outline-none rounded-lg transition-all ${isFolderProcessing ? "opacity-50 pointer-events-none" : ""}`}
        onClick={(e) => handleFolderOpen(folder, e)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleFolderOpen(folder, e);
          }
        }}
      >
        <div className="flex items-center px-3 py-3 sm:px-4 sm:py-3.5 lg:px-4 lg:pr-2 gap-3 sm:gap-4 border border-border bg-card dark:bg-card w-full rounded-lg group-hover:bg-muted dark:group-hover:bg-muted transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-inset">
          <div className="flex-shrink-0">
            <FolderIcon
              folder={folder}
              className="w-5 sm:w-6 h-5 sm:h-6"
              aria-hidden="true"
            />
          </div>
          <div className="w-full min-w-0 flex-1">
            <h3 className="truncate font-semibold text-sm sm:text-base lg:text-base text-foreground">
              {folder.name}
            </h3>
            <p className="truncate text-xs sm:text-sm lg:text-sm text-muted-foreground capitalize">
              {folder.category} · {folder.meta.fileCount} Files
            </p>
          </div>
          {enableDropdownMenu && menuActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={"ghost"}
                  className="flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150 rounded-full p-1 h-8 w-8"
                  size={"sm"}
                  onClick={handleMenuClick}
                  aria-label={`More options for folder ${folder.name}`}
                >
                  <EllipsisVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
            {renderMenuItems(folder, true)}
          </ContextMenuContent>
        </ContextMenu>
      );
    }

    return <div key={folder.id}>{folderElement}</div>;
  };

  const FolderSkeleton = () => (
    <div className="flex items-center px-2 py-4 md:px-4 md:pr-1 md:p-4 border border-border bg-card dark:bg-card w-full rounded-md">
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
    const loadingContent = (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
        {Array.from({ length: initialFolderCount }, (_, i) => (
          <FolderSkeleton key={i} />
        ))}
      </div>
    );

    if (!collapsible) {
      return (
        <div>
          {/* Header with title - always visible during loading */}
          <div className="flex items-center justify-between mb-4">
            {showHeadline && (
              <h2 className="text-lg font-semibold">{headlineText}</h2>
            )}
            {showViewMoreButton && <Skeleton className="h-8 w-20 rounded-full" />}
          </div>

          {loadingContent}
        </div>
      );
    }

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {showHeadline && (
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex-1 h-fit">
              <div className="sticky top-2 z-[10] backdrop-blur-sm flex items-center gap-2 text-left rounded-full border px-4 py-2 hover:bg-accent hover:text-accent-foreground w-fit bg-background/95">
                <CollapsibleTrigger className="flex items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors">
                  <h2 className="text-lg font-semibold whitespace-nowrap">{headlineText}</h2>
                  <ChevronDown
                    className={`flex-shrink-0 w-5 h-5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </CollapsibleTrigger>
              </div>
            </div>
            {showViewMoreButton && <Skeleton className="h-8 w-20 rounded-full flex-shrink-0" />}
          </div>
        )}
        <CollapsibleContent>{loadingContent}</CollapsibleContent>
      </Collapsible>
    );
  }

  if (!folders.length) {
    const emptyContent = (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="mb-6 p-4 rounded-2xl bg-muted dark:bg-muted/50">
          <FolderOpen className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No folders yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          Create your first folder to organize your documents
        </p>
        {onCreateFolder ? (
          <Button size="lg" onClick={handleCreateFolder} disabled={isCreatingFolder}>
            {isCreatingFolder ? "Creating..." : "Create Folder"}
          </Button>
        ) : (
          <Button asChild size="lg">
            <a href="/folder/new">Create Folder</a>
          </Button>
        )}
      </div>
    );

    if (!collapsible) {
      return (
        <div>
          {showHeadline && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{headlineText}</h2>
            </div>
          )}
          {emptyContent}
        </div>
      );
    }

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {showHeadline && (
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex-1 h-fit">
              <div className="sticky top-2 z-[10] backdrop-blur-sm flex items-center gap-2 text-left rounded-full border px-4 py-2 hover:bg-accent hover:text-accent-foreground w-fit bg-background/95">
                <CollapsibleTrigger className="flex items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors">
                  <h2 className="text-lg font-semibold whitespace-nowrap">{headlineText}</h2>
                  <ChevronDown
                    className={`flex-shrink-0 w-5 h-5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </CollapsibleTrigger>
              </div>
            </div>
          </div>
        )}
        <CollapsibleContent>{emptyContent}</CollapsibleContent>
      </Collapsible>
    );
  }

  // Find destructive action for delete dialog
  const _destructiveAction = deleteDialog.action;
  const hasDestructiveActions = enableDelete;

  const content = (
    <div>
      {/* Show display folders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        {displayFolders.map(renderFolderItem)}
      </div>
    </div>
  );

  if (!collapsible) {
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

          {content}
        </div>

        {hasDestructiveActions && (
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
      </Fragment>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      {showHeadline && (
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="flex-1 h-fit">
            <div className="sticky top-2 z-[10] backdrop-blur-sm flex items-center gap-2 text-left rounded-full border px-4 py-2 hover:bg-accent hover:text-accent-foreground w-fit bg-background/95">
              <CollapsibleTrigger className="flex items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors">
                <h2 className="text-lg font-semibold whitespace-nowrap">{headlineText}</h2>
                <ChevronDown
                  className={`flex-shrink-0 w-5 h-5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
            </div>
          </div>
          {showViewMoreButton && hasMoreFolders && (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary font-medium hover:text-teal-700 transition-colors rounded-full flex-shrink-0"
              onClick={() => (window.location.href = "/vault")}
            >
              View More
            </Button>
          )}
        </div>
      )}
      <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        {content}
      </CollapsibleContent>

      {hasDestructiveActions && (
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
