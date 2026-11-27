import { Skeleton } from "@/components/ui/skeleton";
import { useFolderBreadcrumbs } from "@/hooks/use-folder-breadcrumbs";

interface FolderBreadcrumbsProps {
  folderId?: string;
}

/** The open folder's name as the page title. */
export function FolderBreadcrumbs({ folderId }: FolderBreadcrumbsProps) {
  const { breadcrumbs, isLoading } = useFolderBreadcrumbs(folderId);

  if (isLoading) {
    return <Skeleton className="h-7 w-48 rounded bg-muted" />;
  }

  const current = breadcrumbs.at(-1);
  if (!current) return null;

  // The path to this folder lives in the top bar.
  return (
    <h1 className="truncate font-display text-[28px] leading-[1.15] font-bold tracking-[-0.03em] md:text-[32px]">
      {current.name}
    </h1>
  );
}
