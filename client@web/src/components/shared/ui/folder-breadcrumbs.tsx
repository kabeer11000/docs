import { ChevronRight } from "lucide-react";
import { Fragment } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFolderBreadcrumbs } from "@/hooks/use-folder-breadcrumbs";

interface FolderBreadcrumbsProps {
  folderId?: string;
}

export function FolderBreadcrumbs({ folderId }: FolderBreadcrumbsProps) {
  const { breadcrumbs, isLoading } = useFolderBreadcrumbs(folderId);

  if (isLoading) {
    return <Skeleton className="h-7 w-48 rounded bg-muted" />;
  }

  const current = breadcrumbs.at(-1);
  if (!current) return null;
  const trail = breadcrumbs.slice(0, -1);

  return (
    <div className="min-w-0">
      {trail.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="mb-1 flex min-w-0 items-center gap-1 text-[13px] text-muted-foreground"
        >
          {trail.map((item, index) => (
            <Fragment key={item.id}>
              {index > 0 && <ChevronRight className="size-3 shrink-0" />}
              <a
                href={`/folder/${item.id}`}
                className="truncate transition-colors hover:text-foreground"
              >
                {item.name}
              </a>
            </Fragment>
          ))}
        </nav>
      )}
      <h1 className="truncate font-serif text-2xl font-medium tracking-tight">
        {current.name}
      </h1>
    </div>
  );
}
