import type { IFolderItem } from "@shared-types";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { SectionHeader } from "@/components/home/section-header";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "../../ui/button";
import { FolderCard } from "../files/folder-card";

export interface IFolderViewProps {
  showHeadline?: boolean;
  headlineText?: string | ReactNode;
  initialFolderCount?: number;
  folders: IFolderItem[];
  isLoading?: boolean;
  showViewMoreButton?: boolean;
  collapsible?: boolean;
}

/** Folder cards (select, open, rename, drop into, file menu) with an optional "View all". */
export function FoldersView({
  showHeadline,
  headlineText,
  initialFolderCount = 8,
  folders,
  isLoading,
  showViewMoreButton = true,
  collapsible = true,
}: IFolderViewProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  // Nothing to show: hide the whole section instead of a second empty state.
  if (!isLoading && !folders.length) return null;

  const viewMore = showViewMoreButton &&
    folders.length > initialFolderCount &&
    !isLoading && (
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={() => router.push("/vault")}
      >
        View all
      </Button>
    );

  return (
    <Collapsible open={collapsible ? isOpen : true} onOpenChange={setIsOpen}>
      {showHeadline && (
        <SectionHeader
          title={headlineText}
          collapsible={collapsible}
          open={isOpen}
          actions={viewMore}
        />
      )}
      <CollapsibleContent>
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label="Folders"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {isLoading
            ? Array.from({ length: 4 }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
                <Skeleton key={i} className="h-12 rounded-[14px] bg-muted" />
              ))
            : folders
                .slice(0, initialFolderCount)
                .map((f) => (
                  <FolderCard
                    key={f.id}
                    id={f.id}
                    name={f.name}
                    fileCount={f.meta?.fileCount || 0}
                  />
                ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
