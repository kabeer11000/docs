import { ItemName } from "@/components/shared/files/file-item";
import { Skeleton } from "@/components/ui/skeleton";
import { useFolderBreadcrumbs } from "@/hooks/use-folder-breadcrumbs";

interface FolderBreadcrumbsProps {
  folderId?: string;
}

/** The open folder's name as the page title; double-click (or Options > Rename) renames it in place. */
export function FolderBreadcrumbs({ folderId }: FolderBreadcrumbsProps) {
  // Same source as the top bar's trail (no query of its own), optimistic renames included.
  const { breadcrumbs, isLoading } = useFolderBreadcrumbs(folderId);

  if (isLoading) {
    return <Skeleton className="h-7 w-48 rounded bg-muted" />;
  }

  const current = breadcrumbs.at(-1);
  if (!current || !folderId) return null;

  // The path to this folder lives in the top bar.
  return (
    <h1 className="font-display text-[28px] leading-[1.15] font-bold tracking-[-0.03em] md:text-[32px]">
      <ItemName item={{ id: folderId, type: "folder" }} name={current.name} />
    </h1>
  );
}
