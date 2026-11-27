import { useStore } from "@nanostores/react";
import { ItemName } from "@/components/shared/files/file-item";
import { Skeleton } from "@/components/ui/skeleton";
import { useFolderBreadcrumbs } from "@/hooks/use-folder-breadcrumbs";
import { $folders } from "@/state/cloudstore-data";

interface FolderBreadcrumbsProps {
  folderId?: string;
}

/** The open folder's name as the page title; double-click (or Options > Rename) renames it in place. */
export function FolderBreadcrumbs({ folderId }: FolderBreadcrumbsProps) {
  const { breadcrumbs, isLoading } = useFolderBreadcrumbs(folderId);
  // The listed folder carries optimistic renames; the breadcrumb watch catches up after.
  const live = useStore($folders).find((f) => f.id === folderId);

  if (isLoading) {
    return <Skeleton className="h-7 w-48 rounded bg-muted" />;
  }

  const current = breadcrumbs.at(-1);
  if (!current || !folderId) return null;

  // The path to this folder lives in the top bar.
  return (
    <h1 className="font-display text-[28px] leading-[1.15] font-bold tracking-[-0.03em] md:text-[32px]">
      <ItemName
        item={{ id: folderId, type: "folder" }}
        name={live?.name ?? current.name}
      />
    </h1>
  );
}
