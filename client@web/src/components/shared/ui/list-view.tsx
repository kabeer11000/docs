import { useStore } from "@nanostores/react";
import type {
  IFileItem,
  IFolderItem,
  SortDirection,
  SortField,
} from "@shared-types";
import { formatDistanceToNow } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, Folder, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { type ReactNode, useCallback, useMemo, useState } from "react";
import { UserAvatar } from "@/components/avatar/user-avatar";
import { EmptyState } from "@/components/home/empty-state";
import { FileCard } from "@/components/home/file-card";
import { KIND, type KindFilterValue, KindIcon } from "@/components/home/kind";
import { SectionHeader } from "@/components/home/section-header";
import { usePref } from "@/components/home/view-toggle";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocationNames } from "@/hooks/use-location-names";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserNames } from "@/hooks/use-user-names";
import { type FileKind, fileKind, hrefForId } from "@/lib/files";
import { FolderIcon } from "@/lib/folder-icons";
import { cn } from "@/lib/utils";
import { warmFile } from "@/lib/warm";
import { $auth } from "@/state/auth";
import { $documents } from "@/state/cloudstore-data";
import {
  $selection,
  type ItemRef,
  select,
  toggleSelected,
} from "@/state/file-actions";
import {
  ItemName,
  itemStateClass,
  useFileItem,
  useFolderDrop,
} from "../files/file-item";
import { FileContextMenu, FileDropdown } from "../files/file-menu";
import { FolderCard } from "../files/folder-card";

export interface IListItem extends Omit<IFileItem, "meta"> {
  // Extend with folder-specific properties when it's a folder
  category?: string;
  meta?: {
    fileCount?: number;
    color?: string;
    icon?: string;
    showPreview?: boolean;
    // biome-ignore lint/suspicious/noExplicitAny: legacy preview payload
    preview?: any;
    type?: {
      mime: string;
      extension: string;
    };
  };
  itemType: "file" | "folder";
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
  creationParent?: string; // parent folder when creating
  collapsible?: boolean;
  enableSorting?: boolean;
  defaultSortField?: SortField;
  defaultSortDirection?: SortDirection;
  /** Selection checkboxes in list view (selection itself always works). */
  enableBulkSelection?: boolean;
  /** "grid" shows files as cards and folders as compact cards. */
  view?: "list" | "grid";
  /** Show only one kind of file (folders are hidden while filtered). */
  kindFilter?: KindFilterValue;
  /** Controls shown at the start of the toolbar row (e.g. filter chips). */
  filters?: ReactNode;
  /** Remembers sort per section in localStorage. */
  prefsKey?: string;
}

type Row = IListItem & {
  formattedDate: string;
  kind: FileKind;
  content?: unknown;
  data?: unknown;
};

const SORT_LABEL: Partial<Record<SortField, string>> = {
  modified: "Last edited",
  name: "Name",
  owner: "Owner",
};

const fileGridClass =
  "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";

const refOf = (item: IListItem): ItemRef => ({
  id: item.id,
  type: item.itemType,
});

/** Files and folders as a list or a grid. Selection, keyboard, menus and drag and drop come from shared/files. */
export const ListView = React.memo(function ListView({
  showHeadline,
  headlineText,
  items,
  isLoading,
  mode = "folder-contents",
  parent,
  collapsible = true,
  enableSorting = true,
  defaultSortField = "name",
  defaultSortDirection,
  creationParent,
  enableBulkSelection = false,
  view = "list",
  kindFilter = "all",
  filters,
  prefsKey,
}: IListViewProps) {
  const { user } = useStore($auth);
  const { getUserName } = useUserNames();
  const { getLocationName } = useLocationNames();
  const [isOpen, setIsOpen] = useState(true);
  const [sort, setSort] = usePref<{
    field: SortField;
    direction: SortDirection;
  }>(prefsKey && `sort.${prefsKey}`, {
    field: defaultSortField,
    // Newest first is the useful default for dates; A to Z for everything else.
    direction:
      defaultSortDirection ??
      (defaultSortField === "modified" ? "desc" : "asc"),
  });
  const allDocuments = useStore($documents);
  const docById = useMemo(
    () => new Map(allDocuments.map((d) => [d.id, d])),
    [allDocuments],
  );

  const rows = useMemo<Row[]>(() => {
    const withMeta = items.map((item) => {
      const doc = docById.get(item.id);
      return {
        ...item,
        kind: fileKind(doc),
        content: doc?.pages?.[0]?.content,
        data: doc?.data,
        formattedDate: formatDistanceToNow(new Date(item.timestamp.updatedAt), {
          addSuffix: true,
        }),
      };
    });
    return kindFilter === "all"
      ? withMeta
      : withMeta.filter((r) => r.itemType === "file" && r.kind === kindFilter);
  }, [items, kindFilter, docById]);

  const locationLabel = useCallback(
    (item: IListItem) =>
      item.sharing?.isShared && item.owner !== user?.id
        ? "Shared with me"
        : getLocationName(item.location),
    [user?.id, getLocationName],
  );

  const sortedItems = useMemo(() => {
    if (!enableSorting) return rows;
    const value = (r: Row): string | number => {
      switch (sort.field) {
        case "name":
          return r.name.toLowerCase();
        case "modified":
          return new Date(r.timestamp.updatedAt).getTime();
        case "owner":
          return getUserName(r.owner);
        case "location":
          return locationLabel(r);
        default:
          return 0;
      }
    };
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      // Folders first, then the chosen order.
      if (a.itemType !== b.itemType) return a.itemType === "folder" ? -1 : 1;
      const av = value(a);
      const bv = value(b);
      const cmp =
        typeof av === "string" && typeof bv === "string"
          ? av.localeCompare(bv)
          : av < bv
            ? -1
            : av > bv
              ? 1
              : 0;
      return cmp * dir;
    });
  }, [rows, sort, enableSorting, getUserName, locationLabel]);

  const handleSort = (field: SortField) => {
    if (!enableSorting) return;
    setSort(
      sort.field === field
        ? { field, direction: sort.direction === "asc" ? "desc" : "asc" }
        : { field, direction: field === "modified" ? "desc" : "asc" },
    );
  };

  const selection = useStore($selection);
  const ids = sortedItems.map((i) => i.id);
  const selectedHere = ids.filter((id) => selection.includes(id));
  const allSelected = ids.length > 0 && selectedHere.length === ids.length;
  const anySelected = selectedHere.length > 0;
  const checkboxClass = cn(
    "size-4 rounded-[4px] transition-opacity data-[state=checked]:opacity-100",
    anySelected
      ? "opacity-100"
      : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
  );

  const emptyState = (() => {
    const folderId = creationParent || parent || user?.id || "";
    if (kindFilter !== "all" && items.length > 0) {
      return (
        <EmptyState
          title={`No ${KIND[kindFilter].plural.toLowerCase()} here yet`}
          description="Start one and it shows up with your other files."
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
          description="Make something new here, drop files in, or drag files onto it."
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
        className="-ml-1 inline-flex h-7 items-center gap-1 rounded-[6px] px-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring outline-none"
        onClick={() => handleSort(field)}
      >
        {label}
        {sort.field !== field ? (
          <ArrowUpDown className="size-3 opacity-0 group-hover:opacity-60" />
        ) : sort.direction === "asc" ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )}
      </button>
    ) : (
      label
    );

  const gridFolders = sortedItems.filter((i) => i.itemType === "folder");
  const gridFiles = sortedItems.filter((i) => i.itemType === "file");

  const gridContent = isLoading ? (
    <div className={fileGridClass}>
      {["a", "b", "c", "d"].map((k) => (
        <div
          key={k}
          className="overflow-hidden rounded-[14px] bg-card shadow-card"
        >
          <Skeleton className="aspect-[4/3] w-full rounded-none bg-muted" />
          <div className="flex items-center gap-2 p-3">
            <Skeleton className="size-6 rounded-[7px] bg-muted" />
            <Skeleton className="h-3 w-2/3 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="flex flex-col gap-6">
      {gridFolders.length > 0 && (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label="Folders"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {gridFolders.map((f) => (
            <FolderCard
              key={f.id}
              id={f.id}
              name={f.name}
              fileCount={f.meta?.fileCount || 0}
            />
          ))}
        </div>
      )}
      {gridFiles.length > 0 && (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label="Files"
          className={fileGridClass}
        >
          {gridFiles.map((f) => (
            <GridFile key={f.id} item={f} />
          ))}
        </div>
      )}
    </div>
  );

  const skeletonRows = Array.from({ length: 6 }, (_, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
    <TableRow key={i} className="h-12 border-border/60 hover:bg-transparent">
      {enableBulkSelection && <TableCell className="w-9 py-0 pl-3" />}
      <TableCell className={cn("py-0", !enableBulkSelection && "pl-3")}>
        <div className="flex items-center gap-2">
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

  const showContent = isLoading || sortedItems.length > 0;

  const sortMenu = view === "grid" &&
    enableSorting &&
    sortedItems.length > 1 && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground"
          >
            <ArrowUpDown />
            {SORT_LABEL[sort.field] ?? "Sort"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuRadioGroup
            value={sort.field}
            onValueChange={(v) =>
              setSort({
                field: v as SortField,
                direction: v === "modified" ? "desc" : "asc",
              })
            }
          >
            {Object.entries(SORT_LABEL).map(([field, label]) => (
              <DropdownMenuRadioItem key={field} value={field} className="h-8">
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
      {!showContent ? (
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
                      onCheckedChange={() =>
                        select(
                          allSelected
                            ? selection.filter((id) => !ids.includes(id))
                            : [...new Set([...selection, ...ids])],
                        )
                      }
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
              {isLoading
                ? skeletonRows
                : sortedItems.map((item) => (
                    <ListRow
                      key={item.id}
                      item={item}
                      checkbox={enableBulkSelection ? checkboxClass : undefined}
                      ownerName={
                        item.owner === user?.id
                          ? "You"
                          : getUserName(item.owner)
                      }
                      isOwner={item.owner === user?.id}
                      locationName={locationLabel(item)}
                    />
                  ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  return (
    <Collapsible open={collapsible ? isOpen : true} onOpenChange={setIsOpen}>
      {showHeadline && (
        <SectionHeader
          title={headlineText}
          collapsible={collapsible}
          open={isOpen}
        />
      )}
      <CollapsibleContent>{content}</CollapsibleContent>
    </Collapsible>
  );
});

function GridFile({ item }: { item: Row }) {
  const router = useRouter();
  const ref = refOf(item);
  const { props, selected, fresh } = useFileItem(ref);
  const warm = () => {
    router.prefetch(hrefForId(item.id));
    warmFile(item.id, item.kind);
  };
  const isMobile = useIsMobile();
  return (
    <FileContextMenu item={ref}>
      <div
        {...props}
        role="option"
        tabIndex={0}
        aria-selected={selected}
        aria-label={item.name || "Untitled"}
        className="group cursor-default rounded-[14px] outline-none select-none"
        onPointerEnter={warm}
        onFocus={warm}
      >
        <FileCard
          kind={item.kind}
          title={item.name}
          titleNode={<ItemName item={ref} name={item.name} />}
          transitionId={item.id}
          content={item.content}
          data={item.data}
          className={itemStateClass({ selected, fresh })}
          detail={
            <span className="flex items-center gap-1.5">
              <span className="truncate">Edited {item.formattedDate}</span>
              {item.sharing?.isShared && (
                <Users className="size-3 shrink-0" aria-label="Shared" />
              )}
            </span>
          }
          actions={
            <FileDropdown
              item={ref}
              label={`More actions for ${item.name}`}
              alwaysVisible={isMobile}
            />
          }
        />
      </div>
    </FileContextMenu>
  );
}

function ListRow({
  item,
  checkbox,
  ownerName,
  isOwner,
  locationName,
}: {
  item: Row;
  checkbox?: string;
  ownerName: string;
  isOwner: boolean;
  locationName: string;
}) {
  const router = useRouter();
  const ref = refOf(item);
  const { props, selected, fresh } = useFileItem(ref);
  const { over, dropProps } = useFolderDrop(
    item.itemType === "folder" ? item.id : undefined,
  );
  const warm = () => {
    if (item.itemType !== "file") return;
    router.prefetch(hrefForId(item.id));
    warmFile(item.id, item.kind);
  };
  const isMobile = useIsMobile();
  const detail =
    item.itemType === "folder"
      ? `${item.meta?.fileCount || 0} files`
      : `Edited ${item.formattedDate}`;

  return (
    <FileContextMenu item={ref}>
      <TableRow
        {...props}
        {...dropProps}
        aria-label={item.name || "Untitled"}
        data-state={selected ? "selected" : undefined}
        onPointerEnter={warm}
        onFocus={warm}
        className={cn(
          "group h-12 cursor-default border-border/60 outline-none select-none last:border-0 hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:shadow-[inset_0_0_0_2px_var(--ring)] data-[state=selected]:bg-accent",
          !selected && fresh && "bg-highlight/30",
          over && "bg-accent shadow-[inset_0_0_0_2px_var(--ring)]",
        )}
      >
        {checkbox !== undefined && (
          <TableCell
            className="w-9 py-0 pr-0 pl-3"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={selected}
              onCheckedChange={() => toggleSelected(item.id)}
              aria-label={`Select ${item.name}`}
              className={checkbox}
              tabIndex={-1}
            />
          </TableCell>
        )}
        <TableCell className={cn("py-0", checkbox === undefined && "pl-3")}>
          <div className="flex min-w-0 items-center gap-2">
            {item.itemType === "folder" ? (
              <FolderIcon
                folder={item as unknown as IFolderItem}
                className="size-4 shrink-0"
              />
            ) : (
              <KindIcon kind={item.kind} />
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="flex min-w-0 items-center gap-1.5">
                <ItemName
                  item={ref}
                  name={item.name}
                  className="min-w-0 font-display text-[14px] font-semibold tracking-[-0.01em] text-foreground"
                />
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
              <UserAvatar
                id={item.owner}
                name={ownerName}
                size="xs"
                className="shrink-0"
                decorative
              />
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
            tabIndex={-1}
            className="inline-flex max-w-48 items-center gap-1.5 truncate rounded-[6px] text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              router.push(
                item.location &&
                  item.location !== "root" &&
                  item.location !== item.owner
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
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <FileDropdown
            item={ref}
            label={`More actions for ${item.name}`}
            alwaysVisible={isMobile}
          />
        </TableCell>
      </TableRow>
    </FileContextMenu>
  );
}
