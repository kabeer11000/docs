import { useStore } from "@nanostores/react";
import type {
  Document,
  IFileItem,
  IFolderItem,
  IMenuAction,
  SortDirection,
  SortField,
} from "@shared-types";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Copy,
  Download,
  Edit,
  ExternalLink,
  Folder,
  MoreHorizontal,
  Share,
  Trash,
  Users,
  X,
} from "lucide-react";
import React, {
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ShareDialog } from "@/components/editor/share-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useLocationNames } from "@/hooks/use-location-names";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserNames } from "@/hooks/use-user-names";
import { FolderIcon } from "@/lib/folder-icons";
import { $auth } from "@/state/auth";
import { EmptyState } from "@/components/home/empty-state";
import { FolderTab } from "@/components/home/folder-tab";
import { ItemMenu } from "@/components/home/item-menu";
import { fileKind, hrefForId } from "@/lib/files";
import { FileCard } from "@/components/home/file-card";
import { KIND, KindIcon, type KindFilterValue } from "@/components/home/kind";
import { SectionHeader } from "@/components/home/section-header";
import { $documents } from "@/state/cloudstore-data";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "../../ui/avatar";

export interface IListItem extends Omit<IFileItem, "meta"> {
  // Extend with folder-specific properties when it's a folder
  category?: string;
  meta?: {
    fileCount?: number;
    color?: string;
    icon?: string;
    // File meta properties
    showPreview?: boolean;
    preview?: any;
    type?: {
      mime: string;
      extension: string;
    };
  };
  itemType: "file" | "folder";
}

// File-specific menu action interface
export interface IFileMenuAction extends IMenuAction {
  onClick: (item: IListItem) => void;
}

// Re-export shared types for convenience
export type { SortDirection, SortField } from "@shared-types";

export interface IListViewProps {
  showHeadline?: boolean;
  headlineText?: string | ReactNode;
  items: IListItem[];
  isLoading?: boolean;
  mode?: "recent-files" | "folder-contents" | "shared-with-me";
  parent?: string; // parent folder ID for context
  creationParent?: string, // parent folder when creating
  enableContextMenu?: boolean;
  enableDropdownMenu?: boolean;
  collapsible?: boolean;
  // Action enablers
  enableOpen?: boolean;
  enableOpenNewTab?: boolean;
  enableRename?: boolean;
  enableCopy?: boolean;
  enableDelete?: boolean;
  // Sorting props
  enableSorting?: boolean;
  defaultSortField?: SortField;
  defaultSortDirection?: SortDirection;
  // Bulk selection
  enableBulkSelection?: boolean;
  /** "grid" shows files as cards and folders as compact cards. */
  view?: "list" | "grid";
  /** Show only one kind of file (folders are hidden while filtered). */
  kindFilter?: KindFilterValue;
  /** Controls shown at the start of the toolbar row (e.g. filter chips). */
  filters?: ReactNode;
}

const SORT_LABEL: Partial<Record<SortField, string>> = {
  modified: "Last edited",
  name: "Name",
  owner: "Owner",
};

const fileGridClass = "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";

export const ListView = React.memo(function ListView({
  showHeadline,
  headlineText,
  items,
  isLoading,
  mode = "folder-contents",
  parent,
  enableContextMenu = true,
  enableDropdownMenu = true,
  collapsible = true,
  enableOpen = true,
  enableOpenNewTab = true,
  enableRename = true,
  enableCopy = true,
  enableDelete = true,
  enableSorting = true,
  defaultSortField = "name",
  defaultSortDirection,
  creationParent,
  enableBulkSelection = false,
  view = "list",
  kindFilter = "all",
  filters,
}: IListViewProps) {
  const router = useRouter();
  const { user } = useStore($auth);
  const { getUserName, getUserInitials } = useUserNames();
  const [isOpen, setIsOpen] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    item?: IListItem;
    isBulk?: boolean;
  }>({ open: false });
  const [renameDialog, setRenameDialog] = useState<{
    open: boolean;
    item?: IListItem;
  }>({ open: false });
  const [sheetOpen, setSheetOpen] = useState<{
    open: boolean;
    item?: IListItem;
  }>({ open: false });
  const [shareDialog, setShareDialog] = useState<{
    open: boolean;
    document?: Document;
  }>({ open: false });
  // Optimized dropdown state management
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());

  const toggleDropdown = useCallback((itemId: string, open: boolean) => {
    setOpenDropdowns((prev) => {
      if (open && !prev.has(itemId)) {
        const newSet = new Set(prev);
        newSet.add(itemId);
        return newSet;
      } else if (!open && prev.has(itemId)) {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      }
      return prev; // No change needed, return same reference
    });
  }, []);
  const [sortField, setSortField] = useState<SortField>(defaultSortField);
  // Newest first is the useful default for dates; A to Z for everything else.
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    defaultSortDirection ?? (defaultSortField === "modified" ? "desc" : "asc"),
  );
  const [isProcessing, setIsProcessing] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();
  const { getLocationName } = useLocationNames();
  const allDocuments = useStore($documents);
  const docById = useMemo(() => new Map(allDocuments.map((d) => [d.id, d])), [allDocuments]);
  const {
    deleteDocument,
    deleteFolder,
    updateDocument,
    updateFolder,
    duplicateDocument,
    duplicateFolder,
  } = useCloudStore();

  // Clear selection when items change (e.g., after deletion)
  useEffect(() => {
    if (selectedItems.size > 0) {
      const validIds = new Set(items.map((item) => item.id));
      const hasInvalidSelection = Array.from(selectedItems).some(
        (id) => !validIds.has(id),
      );
      if (hasInvalidSelection) {
        setSelectedItems(
          new Set(Array.from(selectedItems).filter((id) => validIds.has(id))),
        );
      }
    }
  }, [items, selectedItems]);

  // Define menu actions internally - memoized to prevent recreation
  const menuActions: IMenuAction[] = useMemo(
    () => [
      ...(enableOpen
        ? [
          {
            id: "open",
            label: "Open",
            icon: ExternalLink,
            onClick: (item: IListItem) => {
              if (item.itemType === "folder") {
                router.push(`/folder/${item.id}`);
              } else {
                router.push(hrefForId(item.id));
              }
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
            onClick: (item: IListItem) => {
              if (item.itemType === "folder") {
                window.open(`/folder/${item.id}`, "_blank");
              } else {
                window.open(hrefForId(item.id), "_blank");
              }
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
            onClick: (item: IListItem) => {
              setRenameDialog({ open: true, item });
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
            onClick: async (item: IListItem) => {
              setIsProcessing((prev) => new Set(prev).add(item.id));
              try {
                const newId =
                  item.itemType === "folder"
                    ? await duplicateFolder(item.id)
                    : await duplicateDocument(item.id);

                if (newId) {
                  // Show success message
                  console.log(`${item.itemType} copied successfully`);
                } else {
                  alert(`Failed to copy ${item.name}`);
                }
              } catch (error) {
                console.error("Copy error:", error);
                alert(`Failed to copy ${item.name}`);
              } finally {
                setIsProcessing((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(item.id);
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
            onClick: (item: IListItem) => {
              setDeleteDialog({ open: true, item });
            },
          },
        ]
        : []),
    ],
    [
      enableOpen,
      enableOpenNewTab,
      enableRename,
      enableCopy,
      enableDelete,
      updateFolder,
      duplicateDocument,
      duplicateFolder,
      router,
    ],
  );

  // Pre-compute formatted dates for performance
  const itemsWithFormattedDates = useMemo(() => {
    const visible =
      kindFilter === "all"
        ? items
        : items.filter((item) => item.itemType === "file" && fileKind(docById.get(item.id)) === kindFilter);
    return visible.map((item) => ({
      ...item,
      formattedDate: formatDistanceToNow(new Date(item.timestamp.updatedAt), {
        addSuffix: true,
      }),
    }));
  }, [items, kindFilter, docById]);

  // Sorting logic
  const sortedItems = useMemo(() => {
    if (!enableSorting) return itemsWithFormattedDates;

    const sorted = [...itemsWithFormattedDates].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "modified":
          aValue = new Date(a.timestamp.updatedAt).getTime();
          bValue = new Date(b.timestamp.updatedAt).getTime();
          break;
        case "owner":
          aValue = getUserName(a.owner);
          bValue = getUserName(b.owner);
          break;
        case "location":
          aValue =
            a.sharing?.isShared && a.owner !== user?.id
              ? "Shared with me"
              : getLocationName(a.location);
          bValue =
            b.sharing?.isShared && b.owner !== user?.id
              ? "Shared with me"
              : getLocationName(b.location);
          break;
        default:
          return 0;
      }

      // Handle string comparison
      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === "asc" ? comparison : -comparison;
      }

      // Handle numeric comparison
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    // Always prioritize folders first, then files
    return sorted.sort((a, b) => {
      if (a.itemType === "folder" && b.itemType === "file") return -1;
      if (a.itemType === "file" && b.itemType === "folder") return 1;
      return 0;
    });
  }, [
    itemsWithFormattedDates,
    sortField,
    sortDirection,
    enableSorting,
    getLocationName,
    getUserName,
  ]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (!enableSorting) return;

      if (sortField === field) {
        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      } else {
        setSortField(field);
        setSortDirection(field === "modified" ? "desc" : "asc");
      }
    },
    [enableSorting, sortField, sortDirection],
  );

  const getSortIcon = useCallback(
    (field: SortField) => {
      if (!enableSorting || sortField !== field) {
        return <ArrowUpDown className="size-3 opacity-0 group-hover:opacity-60" />;
      }
      return sortDirection === "asc" ? (
        <ArrowUp className="size-3" />
      ) : (
        <ArrowDown className="size-3" />
      );
    },
    [enableSorting, sortField, sortDirection],
  );

  const handleItemAction = useCallback(
    (action: IMenuAction, item: IListItem, event?: React.MouseEvent) => {
      event?.preventDefault();
      event?.stopPropagation();

      // Close mobile sheet if open
      if (sheetOpen.open) {
        setSheetOpen({ open: false });
      }

      // Close dropdown for this item
      setOpenDropdowns((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });

      // Execute the action
      action.onClick(item);
    },
    [sheetOpen.open],
  );

  const handleDotsClick = useCallback(
    (item: IListItem, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (isMobile) {
        setSheetOpen({ open: true, item });
      }
    },
    [isMobile],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteDialog.isBulk) {
      // Bulk delete
      const selectedItemsList = sortedItems.filter((item) =>
        selectedItems.has(item.id),
      );
      if (selectedItemsList.length === 0) return;

      setIsProcessing((prev) => {
        const newSet = new Set(prev);
        selectedItemsList.forEach((item) => newSet.add(item.id));
        return newSet;
      });

      try {
        const deletePromises = selectedItemsList.map((item) =>
          item.itemType === "folder"
            ? deleteFolder(item.id)
            : deleteDocument(item.id),
        );
        await Promise.all(deletePromises);
        setSelectedItems(new Set());
        setDeleteDialog({ open: false });
      } catch (error) {
        console.error("Bulk delete error:", error);
        alert("Some items failed to delete");
      } finally {
        setIsProcessing((prev) => {
          const newSet = new Set(prev);
          selectedItemsList.forEach((item) => newSet.delete(item.id));
          return newSet;
        });
      }
    } else {
      // Single item delete
      if (!deleteDialog.item) return;

      const item = deleteDialog.item;
      setIsProcessing((prev) => new Set(prev).add(item.id));

      try {
        const success =
          item.itemType === "folder"
            ? await deleteFolder(item.id)
            : await deleteDocument(item.id);

        if (success) {
          console.log(`${item.name} has been deleted`);
          setDeleteDialog({ open: false });
        } else {
          alert(`Failed to delete ${item.name}`);
        }
      } catch (error) {
        console.error("Delete error:", error);
        alert(`Failed to delete ${item.name}`);
      } finally {
        setIsProcessing((prev) => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });
      }
    }
  }, [deleteDialog, sortedItems, selectedItems, deleteFolder, deleteDocument]);

  const handleRename = async (newName: string) => {
    if (!renameDialog.item) return;

    const item = renameDialog.item;
    setIsProcessing((prev) => new Set(prev).add(item.id));

    try {
      console.log(
        "Renaming item:",
        item.itemType,
        "from",
        item.name,
        "to",
        newName,
      );

      const success =
        item.itemType === "folder"
          ? await updateFolder(item.id, { name: newName })
          : await updateDocument(item.id, { title: newName });

      if (success) {
        console.log("Rename successful");
        setRenameDialog({ open: false });
      } else {
        console.error("Rename failed");
        alert("Failed to rename item");
      }
    } catch (error) {
      console.error("Rename error:", error);
      alert("Failed to rename item");
    } finally {
      setIsProcessing((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const handleItemClick = useCallback((item: IListItem) => {
    if (item.itemType === "folder") {
      router.push(`/folder/${item.id}`);
    } else {
      router.push(hrefForId(item.id));
    }
  }, [router]);

  // Bulk selection handlers
  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedItems.size === sortedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(sortedItems.map((item) => item.id)));
    }
  }, [selectedItems.size, sortedItems]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Bulk action handlers
  const handleBulkDelete = useCallback(() => {
    const selectedItemsList = sortedItems.filter((item) =>
      selectedItems.has(item.id),
    );
    if (selectedItemsList.length === 0) return;

    // Open dialog for bulk delete
    setDeleteDialog({ open: true, isBulk: true });
  }, [selectedItems, sortedItems]);

  const handleBulkDownload = useCallback(async () => {
    const selectedItemsList = sortedItems.filter((item) =>
      selectedItems.has(item.id),
    );
    if (selectedItemsList.length === 0) return;

    selectedItemsList.forEach((item) => {
      const downloadUrl =
        item.itemType === "folder"
          ? `/api/folders/${item.id}/download`
          : `/api/files/${item.id}/download`;
      window.open(downloadUrl, "_blank");
    });
  }, [selectedItems, sortedItems]);

  const handleBulkShare = useCallback(async () => {
    const selectedItemsList = sortedItems.filter((item) =>
      selectedItems.has(item.id),
    );
    if (selectedItemsList.length === 0) return;

    setIsProcessing((prev) => {
      const newSet = new Set(prev);
      selectedItemsList.forEach((item) => newSet.add(item.id));
      return newSet;
    });

    try {
      const sharePromises = selectedItemsList.map((item) => {
        const updates: any =
          item.itemType === "folder"
            ? {
              permissions: {
                ...item.permissions,
                sharedWith: [
                  {
                    userId: "public",
                    access: "read",
                  },
                ],
              },
            }
            : {
              sharing: {
                isShared: true,
                sharedWith: [
                  {
                    userId: "public",
                    access: "read",
                  },
                ],
              },
            };

        return item.itemType === "folder"
          ? updateFolder(item.id, updates)
          : updateDocument(item.id, updates);
      });

      await Promise.all(sharePromises);
      alert(
        `${selectedItemsList.length} item${selectedItemsList.length > 1 ? "s" : ""} shared successfully`,
      );
      setSelectedItems(new Set());
    } catch (error) {
      console.error("Bulk share error:", error);
      alert("Some items failed to share");
    } finally {
      setIsProcessing((prev) => {
        const newSet = new Set(prev);
        selectedItemsList.forEach((item) => newSet.delete(item.id));
        return newSet;
      });
    }
  }, [selectedItems, sortedItems, updateFolder, updateDocument]);

  const renderMenuItems = useCallback(
    (item: IListItem, isContextMenu: boolean = false) => {
      const MenuItemComponent = isContextMenu
        ? ContextMenuItem
        : DropdownMenuItem;
      const SeparatorComponent = isContextMenu
        ? ContextMenuSeparator
        : DropdownMenuSeparator;

      return menuActions.map((action) => (
        <Fragment key={action.id}>
          {action.separator === "before" || action.separator === "both" ? (
            <SeparatorComponent />
          ) : null}
          <MenuItemComponent
            onClick={(e) => handleItemAction(action, item, e)}
            className={
              action.variant === "destructive"
                ? "text-destructive focus:text-destructive"
                : ""
            }
          >
            <action.icon />
            {typeof action.label === "function"
              ? action.label(item)
              : action.label}
          </MenuItemComponent>
          {action.separator === "after" || action.separator === "both" ? (
            <SeparatorComponent />
          ) : null}
        </Fragment>
      ));
    },
    [menuActions, handleItemAction],
  );

  const anySelected = selectedItems.size > 0;
  const allSelected =
    sortedItems.length > 0 && selectedItems.size === sortedItems.length;
  const columnCount = enableBulkSelection ? 6 : 5;
  const checkboxClass = cn(
    "size-4 rounded-[4px] transition-opacity data-[state=checked]:opacity-100",
    anySelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
  );

  const emptyState = (() => {
    const folderId = creationParent || parent || user?.id || "";
    if (kindFilter !== "all" && items.length > 0) {
      const plural = KIND[kindFilter].plural.toLowerCase();
      return (
        <EmptyState
          title={`No ${plural} here yet`}
          description={`Start one and it shows up with your other files.`}
          folderId={folderId}
          kind={kindFilter}
        />
      );
    }
    if (mode === "shared-with-me") {
      return (
        <EmptyState
          title="Nothing shared with you yet"
          description="When someone shares a document, spreadsheet or presentation with you, it lands here."
        />
      );
    }
    if (mode === "recent-files") {
      return (
        <EmptyState
          title="Your files will gather here"
          description="Pick a tile above to start something, or drop a Word, PDF, Excel or PowerPoint file anywhere on this page."
          folderId={folderId}
          quiet
        />
      );
    }
    if (mode === "folder-contents" && parent && parent !== user?.id) {
      return (
        <EmptyState
          title="This folder is empty"
          description="Make something new here, or import a file into it."
          folderId={folderId}
        />
      );
    }
    return (
      <EmptyState
        title="Make your first file"
        description="Write a document, crunch numbers in a spreadsheet or build a deck."
        folderId={folderId}
      />
    );
  })();

  const sortHeader = (field: SortField, label: string) =>
    enableSorting ? (
      <button
        type="button"
        className="-ml-1 inline-flex h-7 items-center gap-1 rounded-md px-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => handleSort(field)}
      >
        {label}
        {getSortIcon(field)}
      </button>
    ) : (
      label
    );

  const renderItem = (item: IListItem & { formattedDate?: string }) => {
    const isItemProcessing = isProcessing.has(item.id);
    const isSelected = selectedItems.has(item.id);
    const isOwner = !!user && item.owner === user.id;
    const ownerName = isOwner ? "You" : getUserName(item.owner);
    const isSharedWithMe = !!item.sharing?.isShared && !isOwner;
    const locationName = isSharedWithMe
      ? "Shared with me"
      : getLocationName(item.location);
    const detail =
      item.itemType === "folder"
        ? `${item.meta?.fileCount || 0} files`
        : `Edited ${item.formattedDate}`;

    const itemElement = (
      <TableRow
        key={item.id}
        data-state={isSelected ? "selected" : undefined}
        className={cn(
          "group h-12 cursor-pointer border-border/60 last:border-0 hover:bg-accent/60 data-[state=selected]:bg-accent",
          isItemProcessing && "pointer-events-none opacity-50",
        )}
        onClick={() => handleItemClick(item)}
      >
        {enableBulkSelection && (
          <TableCell
            className="w-9 py-0 pr-0 pl-3"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleItemSelection(item.id)}
              aria-label={`Select ${item.name}`}
              className={checkboxClass}
            />
          </TableCell>
        )}
        <TableCell className={cn("py-0", !enableBulkSelection && "pl-3")}>
          <div className="flex min-w-0 items-center gap-2.5">
            {item.itemType === "folder" ? (
              <FolderIcon
                folder={item as unknown as IFolderItem}
                className="size-4 shrink-0"
              />
            ) : (
              <KindIcon kind={fileKind(docById.get(item.id))} />
            )}
            <div className="flex min-w-0 flex-col">
              <span className="flex items-center gap-1.5">
                <span className="truncate font-display text-[14px] font-semibold tracking-[-0.01em] text-foreground">
                  {item.name}
                </span>
                {item.sharing?.isShared && (
                  <Users
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-label="Shared"
                  />
                )}
              </span>
              <span className="truncate text-xs text-muted-foreground sm:hidden">
                {detail}
              </span>
            </div>
          </div>
        </TableCell>

        <TableCell className="hidden py-0 text-muted-foreground md:table-cell">
          <span className="flex min-w-0 items-center gap-2">
            {!isOwner && (
              <Avatar className="size-5 shrink-0">
                <AvatarFallback className="text-[10px] font-medium text-muted-foreground">
                  {getUserInitials(item.owner)}
                </AvatarFallback>
              </Avatar>
            )}
            <span className="truncate">{ownerName}</span>
          </span>
        </TableCell>

        <TableCell className="hidden py-0 text-muted-foreground sm:table-cell">
          {item.itemType === "folder" ? detail : item.formattedDate}
        </TableCell>

        <TableCell className="hidden py-0 lg:table-cell">
          <button
            type="button"
            className="inline-flex max-w-48 items-center gap-1.5 truncate text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(
                item.location && item.location !== "root"
                  ? `/folder/${item.location}`
                  : "/vault",
              );
            }}
            title={`Go to ${locationName}`}
          >
            <Folder className="size-3.5 shrink-0" />
            <span className="truncate">{locationName}</span>
          </button>
        </TableCell>

        <TableCell
          className="w-10 py-0 pr-2 text-right"
          onClick={(e) => e.stopPropagation()}
        >
          {itemMenu(item)}
        </TableCell>
      </TableRow>
    );

    return wrapWithContextMenu(item, itemElement);
  };

  const wrapWithContextMenu = (item: IListItem, element: React.ReactElement) =>
    enableContextMenu ? (
      <ContextMenu key={item.id}>
        <ContextMenuTrigger asChild>{element}</ContextMenuTrigger>
        <ContextMenuContent>{renderMenuItems(item, true)}</ContextMenuContent>
      </ContextMenu>
    ) : (
      <Fragment key={item.id}>{element}</Fragment>
    );

  const itemMenu = (item: IListItem) =>
    isMobile ? (
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground"
        onClick={(e) => handleDotsClick(item, e)}
        aria-label={`More actions for ${item.name}`}
      >
        <MoreHorizontal />
      </Button>
    ) : (
      enableDropdownMenu && (
        <ItemMenu
          label={`More actions for ${item.name}`}
          open={openDropdowns.has(item.id)}
          onOpenChange={(open) => toggleDropdown(item.id, open)}
        >
          {renderMenuItems(item, false)}
        </ItemMenu>
      )
    );

  const renderGridFile = (item: IListItem & { formattedDate?: string }) => {
    const doc = docById.get(item.id);
    return wrapWithContextMenu(
      item,
      // biome-ignore lint/a11y/useSemanticElements: card contains a nested menu button
      <div
        role="link"
        tabIndex={0}
        aria-label={`Open ${item.name}`}
        className={cn("group cursor-pointer outline-none", isProcessing.has(item.id) && "pointer-events-none")}
        onClick={() => handleItemClick(item)}
        onPointerEnter={() => router.prefetch(hrefForId(item.id))}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter") handleItemClick(item);
        }}
      >
        <FileCard
          kind={fileKind(doc)}
          title={item.name}
          content={doc?.pages?.[0]?.content}
          data={doc?.data}
          dimmed={isProcessing.has(item.id)}
          detail={
            <span className="flex items-center gap-1.5">
              <span className="truncate">Edited {item.formattedDate}</span>
              {item.sharing?.isShared && <Users className="size-3 shrink-0" aria-label="Shared" />}
            </span>
          }
          actions={itemMenu(item)}
        />
      </div>,
    );
  };

  const renderGridFolder = (item: IListItem) =>
    wrapWithContextMenu(
      item,
      <FolderTab
        name={item.name}
        fileCount={item.meta?.fileCount || 0}
        onOpen={() => handleItemClick(item)}
        disabled={isProcessing.has(item.id)}
        actions={itemMenu(item)}
      />,
    );

  const gridFolders = sortedItems.filter((i) => i.itemType === "folder");
  const gridFiles = sortedItems.filter((i) => i.itemType === "file");

  const gridContent = isLoading ? (
    <div className={fileGridClass}>
      {Array.from({ length: 4 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <div key={i} className="overflow-hidden rounded-[14px] bg-card shadow-card">
          <Skeleton className="aspect-[4/3] w-full rounded-none bg-muted" />
          <div className="flex items-center gap-2.5 p-3">
            <Skeleton className="size-6 rounded-[7px] bg-muted" />
            <Skeleton className="h-3 w-2/3 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="flex flex-col gap-6">
      {gridFolders.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {gridFolders.map(renderGridFolder)}
        </div>
      )}
      {gridFiles.length > 0 && (
        <div className={fileGridClass}>
          {gridFiles.map(renderGridFile)}
        </div>
      )}
    </div>
  );

  const skeletonRows = Array.from({ length: 6 }, (_, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
    <TableRow key={i} className="h-12 border-border/60 hover:bg-transparent">
      {enableBulkSelection && <TableCell className="w-9 py-0 pl-3" />}
      <TableCell className={cn("py-0", !enableBulkSelection && "pl-3")}>
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-6 rounded-[7px] bg-muted" />
          <Skeleton
            className="h-3 rounded bg-muted"
            style={{ width: `${[45, 30, 55, 38, 48, 26][i]}%` }}
          />
        </div>
      </TableCell>
      <TableCell className="hidden py-0 md:table-cell">
        <Skeleton className="h-3 w-10 rounded bg-muted" />
      </TableCell>
      <TableCell className="hidden py-0 sm:table-cell">
        <Skeleton className="h-3 w-28 rounded bg-muted" />
      </TableCell>
      <TableCell className="hidden py-0 lg:table-cell">
        <Skeleton className="h-3 w-16 rounded bg-muted" />
      </TableCell>
      <TableCell className="w-10 py-0" />
    </TableRow>
  ));

  const showTable = isLoading || sortedItems.length > 0;

  const sortMenu = view === "grid" && enableSorting && sortedItems.length > 1 && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground">
          <ArrowUpDown />
          {SORT_LABEL[sortField] ?? "Sort"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup
          value={sortField}
          onValueChange={(v) => {
            setSortField(v as SortField);
            setSortDirection(v === "modified" ? "desc" : "asc");
          }}
        >
          {Object.entries(SORT_LABEL).map(([field, label]) => (
            <DropdownMenuRadioItem key={field} value={field}>
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const toolbar = (filters || sortMenu) && (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {filters}
      {sortMenu}
    </div>
  );

  const content = (
    <div>
      {toolbar}
      {enableBulkSelection && anySelected && view === "list" && (
        <div className="mb-2 flex h-10 items-center gap-2 rounded-[12px] bg-card px-1.5 shadow-card">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={clearSelection}
            aria-label="Clear selection"
          >
            <X />
          </Button>
          <span className="text-sm font-medium">
            {selectedItems.size} selected
          </span>
          {enableDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleBulkDelete}
            >
              <Trash />
              Delete
            </Button>
          )}
        </div>
      )}
      {!showTable ? (
        emptyState
      ) : view === "grid" ? (
        gridContent
      ) : (
        <div className="overflow-hidden rounded-[14px] bg-card px-1 shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="group h-9 border-border hover:bg-transparent">
              {enableBulkSelection && (
                <TableHead className="w-9 pr-0 pl-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                    className={checkboxClass}
                    disabled={isLoading}
                  />
                </TableHead>
              )}
              <TableHead className={cn(!enableBulkSelection && "pl-3")}>
                {sortHeader("name", "Name")}
              </TableHead>
              <TableHead className="hidden w-40 md:table-cell">
                {sortHeader("owner", "Owner")}
              </TableHead>
              <TableHead className="hidden w-48 sm:table-cell">
                {sortHeader("modified", "Last edited")}
              </TableHead>
              <TableHead className="hidden w-44 lg:table-cell">
                {sortHeader("location", "Location")}
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? skeletonRows : sortedItems.map(renderItem)}
          </TableBody>
        </Table>
        </div>
      )}
    </div>
  );

  const overlays = (
    <>
      {enableDelete && (
        <DeleteConfirmationDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ open })}
          itemName={deleteDialog.item?.name || ""}
          itemType={deleteDialog.item?.itemType || "file"}
          onConfirm={handleDeleteConfirm}
          isLoading={
            deleteDialog.isBulk
              ? Array.from(selectedItems).some((id) => isProcessing.has(id))
              : deleteDialog.item
                ? isProcessing.has(deleteDialog.item.id)
                : false
          }
          count={deleteDialog.isBulk ? selectedItems.size : undefined}
        />
      )}

      {enableRename && (
        <RenameDialog
          open={renameDialog.open}
          onOpenChange={(open) => setRenameDialog({ open })}
          itemName={renameDialog.item?.name || ""}
          itemType={renameDialog.item?.itemType || "file"}
          onConfirm={handleRename}
          isLoading={
            renameDialog.item ? isProcessing.has(renameDialog.item.id) : false
          }
        />
      )}

      <Sheet open={sheetOpen.open} onOpenChange={(open) => setSheetOpen({ open })}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle className="text-left">{sheetOpen.item?.name}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-1 px-2 pb-4">
            {menuActions.map((action) => (
              <Button
                key={action.id}
                variant="ghost"
                className={cn(
                  "justify-start",
                  action.variant === "destructive" &&
                    "text-destructive hover:text-destructive",
                )}
                onClick={(e) =>
                  sheetOpen.item && handleItemAction(action, sheetOpen.item, e)
                }
              >
                <action.icon />
                {typeof action.label === "function" && sheetOpen.item
                  ? action.label(sheetOpen.item)
                  : (action.label as ReactNode)}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );

  return (
    <TooltipProvider>
      <Collapsible open={collapsible ? isOpen : true} onOpenChange={setIsOpen}>
        {showHeadline && (
          <SectionHeader
            title={headlineText}
            collapsible={collapsible}
            open={isOpen}
          />
        )}
        <CollapsibleContent>{content}</CollapsibleContent>
        {overlays}
      </Collapsible>
    </TooltipProvider>
  );
});
