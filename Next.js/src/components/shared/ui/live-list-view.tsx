import type { SortField } from "@shared-types";
import React from "react";
import { ListView } from "@/components/shared/ui/list-view";
import { useDocuments } from "@/hooks/use-documents";

interface LiveListViewProps {
  headlineText?: string;
  showHeadline?: boolean;
  defaultSortField?: SortField;
  collapsible?: boolean;
  sortable?: boolean;
  parent?: string; // parent-folder.id
  mode?: "recent-files" | "folder-contents" | "shared-with-me";
}

export const LiveListView = React.memo(function LiveListView({
  headlineText = "My Files",
  parent,
  showHeadline = true,
  defaultSortField = "modified",
  collapsible = true,
  sortable = true,
  mode = "folder-contents",
}: LiveListViewProps) {
  const { documents, isLoading } = useDocuments(parent, mode);

  return (
    <ListView
      headlineText={headlineText}
      items={documents}
      showHeadline={showHeadline}
      defaultSortField={defaultSortField}
      collapsible={collapsible}
      isLoading={isLoading}
      mode={mode}
      enableContextMenu={true}
      enableDropdownMenu={true}
      enableOpen={true}
      enableOpenNewTab={true}
      enableDetails={true}
      enableRename={true}
      enableShare={true}
      enableCopy={false}
      enableDownload={true}
      enableDelete={true}
      enableSorting={true}
      enableBulkSelection={true}
    />
  );
});
