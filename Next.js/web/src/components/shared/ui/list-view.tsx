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
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Copy,
  Download,
  Edit,
  ExternalLink,
  FileText,
  Folder,
  MoreVertical,
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
import { PiFilePdf, PiFileText, PiInfo } from "react-icons/pi";
import { ShareDialog } from "@/components/editor/share-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useLocationNames } from "@/hooks/use-location-names";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserNames } from "@/hooks/use-user-names";
import cloudStore from "@/lib/cloudstore";
import { FolderIcon } from "@/lib/folder-icons";
import { $auth } from "@/state/auth";
import { Avatar } from "../../ui/avatar";

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
  enableContextMenu?: boolean;
  enableDropdownMenu?: boolean;
  collapsible?: boolean;
  // Action enablers
  enableOpen?: boolean;
  enableOpenNewTab?: boolean;
  enableDetails?: boolean;
  enableRename?: boolean;
  enableShare?: boolean;
  enableCopy?: boolean;
  enableDownload?: boolean;
  enableDelete?: boolean;
  // Sorting props
  enableSorting?: boolean;
  defaultSortField?: SortField;
  defaultSortDirection?: SortDirection;
  // Bulk selection
  enableBulkSelection?: boolean;
}

function getFileIcon(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "pdf":
      return PiFilePdf;
    case "doc":
    case "docx":
      return PiFileText;
    default:
      return PiFileText;
  }
}

export const ListView = React.memo(function ListView({
  showHeadline,
  headlineText,
  items,
  isLoading,
  mode = "folder-contents",
  enableContextMenu = true,
  enableDropdownMenu = true,
  collapsible = true,
  enableOpen = true,
  enableOpenNewTab = true,
  enableDetails = true,
  enableRename = true,
  enableShare = true,
  enableCopy = true,
  enableDownload = true,
  enableDelete = true,
  enableSorting = true,
  defaultSortField = "name",
  defaultSortDirection = "asc",
  enableBulkSelection = false,
}: IListViewProps) {
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
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(defaultSortDirection);
  const [isProcessing, setIsProcessing] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();
  const { getLocationName } = useLocationNames();
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
                  window.location.href = `/folder/${item.id}`;
                } else {
                  window.location.href = `/document/${item.id}`;
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
                  window.location.href = `/folder/${item.id}`;
                } else {
                  window.location.href = `/document/${item.id}`;
                }
              },
            },
          ]
        : []),
      ...(enableDetails
        ? [
            {
              id: "showDetails",
              label: (item: any) =>
                item?.itemType === "folder"
                  ? "Show folder details"
                  : "Show details",
              icon: PiInfo,
              onClick: (_item: IListItem) => {},
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
      ...(enableShare
        ? [
            {
              id: "share",
              label: "Share",
              icon: Share,
              onClick: async (item: IListItem) => {
                if (item.itemType === "folder") {
                  // For folders, use the old inline sharing behavior
                  setIsProcessing((prev) => new Set(prev).add(item.id));
                  try {
                    const updates: any = {
                      permissions: {
                        ...item.permissions,
                        sharedWith: [
                          {
                            userId: "public",
                            access: "read",
                          },
                        ],
                      },
                    };

                    const success = await updateFolder(item.id, updates);

                    if (
                      success &&
                      typeof navigator !== "undefined" &&
                      navigator.clipboard
                    ) {
                      const shareUrl = `${window.location.origin}/folder/${item.id}/share`;
                      await navigator.clipboard.writeText(shareUrl);
                      alert(`Share link for ${item.name} copied to clipboard!`);
                    } else if (success) {
                      alert(`${item.name} is now shared publicly`);
                    } else {
                      alert("Failed to share folder");
                    }
                  } catch (error) {
                    console.error("Share error:", error);
                    alert("Failed to share folder");
                  } finally {
                    setIsProcessing((prev) => {
                      const newSet = new Set(prev);
                      newSet.delete(item.id);
                      return newSet;
                    });
                  }
                } else {
                  // For documents, open the ShareDialog
                  setIsProcessing((prev) => new Set(prev).add(item.id));
                  try {
                    const documentsCollection =
                      cloudStore.collection("documents");
                    const query = cloudStore.query
                      .where("_id", "EQUAL", item.id)
                      .limit(1);
                    const result = (await documentsCollection.get(
                      query,
                    )) as Document[];

                    if (result && result.length > 0) {
                      setShareDialog({ open: true, document: result[0] });
                    } else {
                      alert("Failed to load document");
                    }
                  } catch (error) {
                    console.error("Failed to load document:", error);
                    alert("Failed to load document");
                  } finally {
                    setIsProcessing((prev) => {
                      const newSet = new Set(prev);
                      newSet.delete(item.id);
                      return newSet;
                    });
                  }
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
      ...(enableDownload
        ? [
            {
              id: "download",
              label: "Download",
              icon: Download,
              onClick: (item: IListItem) => {
                const downloadUrl =
                  item.itemType === "folder"
                    ? `/api/folders/${item.id}/download`
                    : `/api/files/${item.id}/download`;
                window.open(downloadUrl, "_blank");
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
      enableDetails,
      enableRename,
      enableShare,
      enableCopy,
      enableDownload,
      enableDelete,
      updateFolder,
      duplicateDocument,
      duplicateFolder,
    ],
  );

  // Pre-compute formatted dates for performance
  const itemsWithFormattedDates = useMemo(() => {
    return items.map((item) => ({
      ...item,
      formattedDate: formatDistanceToNow(new Date(item.timestamp.updatedAt), {
        addSuffix: true,
      }),
    }));
  }, [items]);

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
          aValue = new Date(a.timestamp.createdAt).getTime();
          bValue = new Date(b.timestamp.createdAt).getTime();
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
        setSortDirection("asc");
      }
    },
    [enableSorting, sortField, sortDirection],
  );

  const getSortIcon = useCallback(
    (field: SortField) => {
      if (!enableSorting || sortField !== field) {
        return <ArrowUpDown className="w-4 h-4 opacity-50" />;
      }
      return sortDirection === "asc" ? (
        <ArrowUp className="w-4 h-4" />
      ) : (
        <ArrowDown className="w-4 h-4" />
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
      window.location.href = `/folder/${item.id}`;
    } else {
      window.location.href = `/document/${item.id}`;
    }
  }, []);

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
            <action.icon className="mr-2 h-4 w-4" />
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

  const ItemRowSkeleton = () => (
    <TableRow className="group border-t-border-neutral-400 hover:bg-neutral-200 transition-colors">
      <TableCell className="p-0 sm:p-2 md:p-4 rounded-l-md">
        <div className="flex items-center gap-3 min-w-0 p-2 sm:p-0">
          <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
            <Skeleton className="h-6 w-6 rounded" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32 rounded" />
            </div>
            <div className="sm:hidden mt-1">
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground p-2 md:p-4">
        <Skeleton className="h-3 w-28 rounded" />
      </TableCell>

      <TableCell className="hidden md:table-cell p-2 md:p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-3 w-6 rounded" />
        </div>
      </TableCell>

      <TableCell className="hidden lg:table-cell p-2 md:p-4">
        <div className="flex items-center transition-colors rounded-full">
          <Skeleton className="h-3 w-3 rounded-full mr-1" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
      </TableCell>

      <TableCell className="text-center rounded-r-md p-2 md:p-4">
        <Skeleton className="h-4 w-4 rounded mx-auto" />
      </TableCell>
    </TableRow>
  );

  const EmptyState = () => {
    const getEmptyStateContent = () => {
      if (mode === "recent-files") {
        return {
          icon: FileText,
          title: "No recent files",
          description: "Create your first document to get started",
          action: "Create Document",
          actionLink: "/document/new",
        };
      } else {
        return {
          icon: FileText,
          title: "This folder is empty",
          description: "Create your first document to get started",
          action: "Create Document",
          actionLink: "/document/new",
        };
      }
    };

    const {
      icon: Icon,
      title,
      description,
      action,
      actionLink,
    } = getEmptyStateContent();

    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="mb-6 p-4 rounded-2xl bg-muted dark:bg-muted/50">
          <Icon className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {description}
        </p>
        <Button asChild size="lg">
          <a href={actionLink}>{action}</a>
        </Button>
      </div>
    );
  };

  // Memoized individual row component for maximum performance
  const _TableRowItem = React.memo(({ item }: { item: IListItem }) => {
    const isItemProcessing = isProcessing.has(item.id);
    const itemElement = (
      <TableRow
        className={`group border-t-border-neutral-400 hover:bg-neutral-200 transition-colors cursor-pointer ${isItemProcessing ? "opacity-50 pointer-events-none" : ""}`}
      >
        <TableCell
          className="p-0 sm:p-2 md:p-4 rounded-l-md"
          onClick={() => handleItemClick(item)}
        >
          <div className="flex items-center gap-3 min-w-0 p-2 sm:p-0">
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
              {item.itemType === "folder" ? (
                <FolderIcon
                  folder={item as unknown as IFolderItem}
                  className="w-6 h-6"
                />
              ) : (
                (() => {
                  const IconComponent = getFileIcon(item.name);
                  return (
                    <IconComponent className="w-6 h-6 text-muted-foreground" />
                  );
                })()
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground truncate">
                  {item.name}
                </span>
                {item.sharing?.isShared && (
                  <Users className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="sm:hidden text-sm text-muted-foreground mt-1">
                {item.itemType === "folder"
                  ? `${item.category} • ${item.meta?.fileCount || 0} Files`
                  : `You edited • ${formatDistanceToNow(new Date(item.timestamp.createdAt), { addSuffix: true })}`}
              </div>
            </div>
          </div>
        </TableCell>

        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground p-2 md:p-4">
          {item.itemType === "folder"
            ? `${item.category} • ${item.meta?.fileCount || 0} Files`
            : `You edited • ${formatDistanceToNow(new Date(item.timestamp.createdAt), { addSuffix: true })}`}
        </TableCell>

        <TableCell className="hidden md:table-cell p-2 md:p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Tooltip>
              <TooltipTrigger>
                <Avatar className="bg-primary/60 text-white border text-center items-center flex justify-center">
                  {getUserInitials(item.owner)}
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{getUserName(item.owner)}</p>
              </TooltipContent>
            </Tooltip>
            <span className="truncate">{getUserName(item.owner)}</span>
          </div>
        </TableCell>

        <TableCell className="hidden lg:table-cell p-2 md:p-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={"ghost"}
                size={"sm"}
                className="flex items-center transition-colors rounded-full cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Navigate to the actual folder location
                  if (item.location && item.location !== "root") {
                    window.location.href = `/folder/${item.location}`;
                  } else {
                    // If no location or root, go to vault
                    window.location.href = "/vault";
                  }
                }}
              >
                <Folder className="w-3 h-3" />
                <span className="truncate">
                  {item.sharing?.isShared && item.owner !== user?.id
                    ? "Shared with me"
                    : getLocationName(item.location)}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Go to{" "}
                {item.sharing?.isShared && item.owner !== user?.id
                  ? "Shared with me"
                  : getLocationName(item.location)}
              </p>
            </TooltipContent>
          </Tooltip>
        </TableCell>

        <TableCell className="text-center rounded-r-md p-2 md:p-4">
          {isMobile ? (
            <Button
              variant="ghost"
              size="icon"
              className="p-1 h-auto aspect-square text-muted-foreground group-hover:text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity rounded-full"
              onClick={(e) => handleDotsClick(item, e)}
              aria-label={`More actions for ${item.name}`}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          ) : (
            enableDropdownMenu && (
              <DropdownMenu
                open={openDropdowns.has(item.id)}
                onOpenChange={(open) => toggleDropdown(item.id, open)}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-1 aspect-square h-auto text-muted-foreground group-hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    aria-label={`More actions for ${item.name}`}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {renderMenuItems(item, false)}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          )}
        </TableCell>
      </TableRow>
    );

    if (enableContextMenu) {
      return (
        <ContextMenu key={item.id}>
          <ContextMenuTrigger asChild>{itemElement}</ContextMenuTrigger>
          <ContextMenuContent>{renderMenuItems(item, true)}</ContextMenuContent>
        </ContextMenu>
      );
    }

    return itemElement;
  });

  const renderItem = useCallback(
    (item: IListItem) => {
      const isItemProcessing = isProcessing.has(item.id);
      const isSelected = selectedItems.has(item.id);
      const itemElement = (
        <TableRow
          key={item.id}
          className={`group border-t-border-neutral-400 hover:bg-neutral-200 transition-colors cursor-pointer ${isItemProcessing ? "opacity-50 pointer-events-none" : ""} ${isSelected ? "bg-blue-50" : ""}`}
        >
          {enableBulkSelection && (
            <TableCell
              className="w-12 p-2 md:p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleItemSelection(item.id)}
                aria-label={`Select ${item.name}`}
                className="border-2 border-neutral-400 bg-white"
              />
            </TableCell>
          )}
          <TableCell
            className="p-0 sm:p-2 md:p-4 rounded-l-md"
            onClick={() => handleItemClick(item)}
          >
            <div className="flex items-center gap-3 min-w-0 p-2 sm:p-0">
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {item.itemType === "folder" ? (
                  <FolderIcon
                    folder={item as unknown as IFolderItem}
                    className="w-6 h-6"
                  />
                ) : (
                  (() => {
                    const IconComponent = getFileIcon(item.name);
                    return (
                      <IconComponent className="w-6 h-6 text-muted-foreground" />
                    );
                  })()
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">
                    {item.name}
                  </span>
                  {item.sharing?.isShared && (
                    <Users className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="sm:hidden text-sm text-muted-foreground mt-1">
                  {item.itemType === "folder"
                    ? `${item.category} • ${item.meta?.fileCount || 0} Files`
                    : `You edited • ${(item as any).formattedDate}`}
                </div>
              </div>
            </div>
          </TableCell>

          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground p-2 md:p-4">
            {item.itemType === "folder"
              ? `${item.category} • ${item.meta?.fileCount || 0} Files`
              : `You edited • ${(item as any).formattedDate}`}
          </TableCell>

          <TableCell className="hidden md:table-cell p-2 md:p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="bg-primary/60 text-white border text-center items-center flex justify-center">
                    {getUserInitials(item.owner)}
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getUserName(item.owner)}</p>
                </TooltipContent>
              </Tooltip>
              <span className="truncate">{getUserName(item.owner)}</span>
            </div>
          </TableCell>

          <TableCell className="hidden lg:table-cell p-2 md:p-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={"ghost"}
                  size={"sm"}
                  className="flex items-center transition-colors rounded-full cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Navigate to the actual folder location
                    if (item.location && item.location !== "root") {
                      window.location.href = `/folder/${item.location}`;
                    } else {
                      // If no location or root, go to vault
                      window.location.href = "/vault";
                    }
                  }}
                >
                  <Folder className="w-3 h-3" />
                  <span className="truncate">
                    {item.sharing?.isShared && item.owner !== user?.id
                      ? "Shared with me"
                      : getLocationName(item.location)}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Go to{" "}
                  {item.sharing?.isShared && item.owner !== user?.id
                    ? "Shared with me"
                    : getLocationName(item.location)}
                </p>
              </TooltipContent>
            </Tooltip>
          </TableCell>

          <TableCell className="text-center rounded-r-md p-2 md:p-4">
            {isMobile ? (
              <Button
                variant="ghost"
                size="icon"
                className="p-1 h-auto aspect-square text-muted-foreground group-hover:text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity rounded-full"
                onClick={(e) => handleDotsClick(item, e)}
                aria-label={`More actions for ${item.name}`}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            ) : (
              enableDropdownMenu && (
                <DropdownMenu
                  open={openDropdowns.has(item.id)}
                  onOpenChange={(open) => toggleDropdown(item.id, open)}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-1 aspect-square h-auto text-muted-foreground group-hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      aria-label={`More actions for ${item.name}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {renderMenuItems(item, false)}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            )}
          </TableCell>
        </TableRow>
      );

      if (enableContextMenu) {
        return (
          <ContextMenu key={item.id}>
            <ContextMenuTrigger asChild>{itemElement}</ContextMenuTrigger>
            <ContextMenuContent>
              {renderMenuItems(item, true)}
            </ContextMenuContent>
          </ContextMenu>
        );
      }

      return itemElement;
    },
    [
      isProcessing,
      selectedItems,
      openDropdowns,
      isMobile,
      enableBulkSelection,
      enableDropdownMenu,
      enableContextMenu,
      renderMenuItems,
      handleDotsClick,
      handleItemClick,
      toggleItemSelection,
      getLocationName,
      getUserInitials,
      getUserName,
      toggleDropdown,
    ],
  );

  // Bulk action toolbar
  const bulkActionToolbar = enableBulkSelection && selectedItems.size > 0 && (
    <div className="sticky top-0 z-20 bg-background border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={clearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {selectedItems.size} item{selectedItems.size > 1 ? "s" : ""} selected
        </span>
      </div>
      <div className="flex items-center gap-2">
        {enableShare && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkShare}
            disabled={selectedItems.size === 0}
          >
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
        {enableDownload && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkDownload}
            disabled={selectedItems.size === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}
        {enableDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={selectedItems.size === 0}
          >
            <Trash className="h-4 w-4 mr-2" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );

  const content = (
    <div className=" rounded-lg overflow-hidden">
      {bulkActionToolbar}
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {enableBulkSelection && (
              <TableHead className="w-12 p-2 md:p-4">
                <Checkbox
                  checked={
                    selectedItems.size === sortedItems.length &&
                    sortedItems.length > 0
                  }
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                  className="border-2 border-neutral-400 bg-white"
                />
              </TableHead>
            )}
            <TableHead className="text-muted-foreground font-medium p-2 md:p-4">
              {enableSorting ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => handleSort("name")}
                >
                  Name
                  {getSortIcon("name")}
                </Button>
              ) : (
                "Name"
              )}
            </TableHead>
            <TableHead className="text-muted-foreground font-medium hidden sm:table-cell p-2 md:p-4">
              {enableSorting ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => handleSort("modified")}
                >
                  Details
                  {getSortIcon("modified")}
                </Button>
              ) : (
                "Details"
              )}
            </TableHead>
            <TableHead className="text-muted-foreground font-medium hidden md:table-cell p-2 md:p-4">
              {enableSorting ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => handleSort("owner")}
                >
                  Owner
                  {getSortIcon("owner")}
                </Button>
              ) : (
                "Owner"
              )}
            </TableHead>
            <TableHead className="text-muted-foreground font-medium hidden lg:table-cell p-2 md:p-4">
              {enableSorting ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => handleSort("location")}
                >
                  Location
                  {getSortIcon("location")}
                </Button>
              ) : (
                "Location"
              )}
            </TableHead>
            <TableHead className="w-12 p-2 md:p-4"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }, (_, i) => <ItemRowSkeleton key={i} />)
          ) : sortedItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={enableBulkSelection ? 6 : 5} className="p-0">
                <EmptyState />
              </TableCell>
            </TableRow>
          ) : (
            sortedItems.map(renderItem)
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (!collapsible) {
    return (
      <Fragment>
        {showHeadline && (
          <div className="flex items-center justify-between mb-0">
            <h2 className="text-lg font-semibold mb-0">{headlineText}</h2>
          </div>
        )}
        {content}

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

        {enableShare && shareDialog.document && (
          <ShareDialog
            open={shareDialog.open}
            onOpenChange={(open) => setShareDialog({ open })}
            document={shareDialog.document}
          />
        )}

        <Sheet
          open={sheetOpen.open}
          onOpenChange={(open) => setSheetOpen({ open })}
        >
          <SheetContent side="bottom" className="h-auto rounded-t-lg">
            <SheetHeader>
              <SheetTitle className="text-left">
                Actions for {sheetOpen.item?.name}
              </SheetTitle>
            </SheetHeader>
            <div className="grid gap-2 py-4">
              {menuActions.map((action) => (
                <Button
                  key={action.id}
                  variant="ghost"
                  className={`justify-start ${action.variant === "destructive" ? "text-destructive hover:text-destructive" : ""}`}
                  onClick={(e) =>
                    sheetOpen.item &&
                    handleItemAction(action, sheetOpen.item, e)
                  }
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  {typeof action.label === "function"
                    ? action.label(sheetOpen.item!)
                    : action.label}
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </Fragment>
    );
  }

  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {showHeadline && (
          <div className="flex sticky top-2 z-[10] items-center justify-between mb-0">
            <div className="flex-1">
              <CollapsibleTrigger className="backdrop-blur-sm flex items-center gap-2 text-left rounded-full border px-4 py-2 hover:bg-accent hover:text-accent-foreground w-fit">
                <h2 className="text-lg font-semibold">{headlineText}</h2>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
            </div>
          </div>
        )}
        <CollapsibleContent>{content}</CollapsibleContent>

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

        {enableShare && shareDialog.document && (
          <ShareDialog
            open={shareDialog.open}
            onOpenChange={(open) => setShareDialog({ open })}
            document={shareDialog.document}
          />
        )}

        <Sheet
          open={sheetOpen.open}
          onOpenChange={(open) => setSheetOpen({ open })}
        >
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle className="text-left">
                Actions for {sheetOpen.item?.name}
              </SheetTitle>
            </SheetHeader>
            <div className="grid gap-2 py-4">
              {menuActions.map((action) => (
                <Button
                  key={action.id}
                  variant="ghost"
                  className={`justify-start ${action.variant === "destructive" ? "text-destructive hover:text-destructive" : ""}`}
                  onClick={(e) =>
                    sheetOpen.item &&
                    handleItemAction(action, sheetOpen.item, e)
                  }
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  {typeof action.label === "function"
                    ? action.label(sheetOpen.item!)
                    : action.label}
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </Collapsible>
    </TooltipProvider>
  );
});
