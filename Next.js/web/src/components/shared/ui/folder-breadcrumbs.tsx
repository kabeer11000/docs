import { useFolderBreadcrumbs } from "@/hooks/use-folder-breadcrumbs";

interface FolderBreadcrumbsProps {
  folderId?: string;
}

export function FolderBreadcrumbs({ folderId }: FolderBreadcrumbsProps) {
  const { breadcrumbs, isLoading } = useFolderBreadcrumbs(folderId);

  if (isLoading) {
    return (
      <div className="flex items-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center text-sm text-muted-foreground">
      {breadcrumbs.map((item, index) => (
        <span key={item.id} className="flex items-center">
          {index > 0 && <span className="mx-2">/</span>}
          <span
            className={
              index === breadcrumbs.length - 1
                ? "text-foreground font-medium"
                : ""
            }
          >
            {item.name}
          </span>
        </span>
      ))}
    </div>
  );
}
