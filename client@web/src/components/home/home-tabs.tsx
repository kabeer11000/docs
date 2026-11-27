"use client";

import { useStore } from "@nanostores/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { FoldersView } from "@/components/shared/ui/folders-view";
import { ListView } from "@/components/shared/ui/list-view";
import { useDocuments } from "@/hooks/use-documents";
import { useSharedFolders } from "@/hooks/use-shared-folders";
import { cn } from "@/lib/utils";
import { $documents } from "@/state/cloudstore-data";
import { EmptyState } from "./empty-state";
import type { ViewMode } from "./view-toggle";

export type HomeTab = "recent" | "starred" | "shared" | "vault";

const TABS: { id: HomeTab; label: string; href: string; tour?: string }[] = [
  { id: "recent", label: "Recent", href: "/home" },
  {
    id: "starred",
    label: "Starred",
    href: "/home?tab=starred",
    tour: "starred",
  },
  { id: "shared", label: "Shared with me", href: "/shared" },
  { id: "vault", label: "Vault", href: "/vault", tour: "nav-vault" },
];

/** Route-backed tabs under the greeting; each tab is its own URL so back/forward and links work. */
export function HomeTabs({
  active,
  actions,
}: {
  active: HomeTab;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 border-b border-border">
      <nav
        aria-label="Files"
        className="-mb-px flex min-w-0 gap-1 overflow-x-auto scrollbar-hide"
      >
        {TABS.map((tab) => {
          const selected = tab.id === active;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              data-tour={tab.tour}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "shrink-0 border-b-2 px-2.5 pt-1 pb-2.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:text-foreground",
                selected
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {actions && <div className="mb-1.5 shrink-0">{actions}</div>}
    </div>
  );
}

/** Starred folders as cards, starred files as the usual list. Replaces the old sidebar section. */
export function StarredView({ view }: { view: ViewMode }) {
  const router = useRouter();
  const all = useStore($documents);
  const { documents, isLoading } = useDocuments(undefined, "recent-files");
  const { folders, isLoading: foldersLoading } = useSharedFolders();

  const starredIds = useMemo(
    () => new Set(all.filter((d) => d.isStarred).map((d) => d.id)),
    [all],
  );
  const files = useMemo(
    () => documents.filter((d) => starredIds.has(d.id)),
    [documents, starredIds],
  );
  const starredFolders = useMemo(
    () => folders.filter((f) => f.isStarred),
    [folders],
  );

  if (
    !isLoading &&
    !foldersLoading &&
    files.length === 0 &&
    starredFolders.length === 0
  ) {
    return (
      <EmptyState
        title="Nothing starred yet"
        description="Star a file or folder from its menu and it shows up here, one click away."
      />
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {starredFolders.length > 0 && (
        <FoldersView
          headlineText="Folders"
          folders={starredFolders}
          onFolderOpen={(folder) => router.push(`/folder/${folder.id}`)}
          showHeadline
          collapsible={false}
          enableContextMenu
          enableDropdownMenu
          enableRename
          enableCopy={false}
          enableDelete
        />
      )}
      {(files.length > 0 || isLoading) && (
        <ListView
          items={files}
          isLoading={isLoading}
          mode="recent-files"
          collapsible={false}
          defaultSortField="modified"
          enableCopy={false}
          view={view}
        />
      )}
    </div>
  );
}
