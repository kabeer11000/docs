import type { SortField } from "@shared-types";
import React from "react";
import { ListView } from "@/components/shared/ui/list-view";
import { useDocuments } from "@/hooks/use-documents";

interface LiveListViewProps {
  headlineText?: string;
  showHeadline?: boolean;
  defaultSortField?: SortField;
  collapsible?: boolean;
  creationParent?: string;
  parent?: string; // parent-folder.id
  mode?: "recent-files" | "folder-contents" | "shared-with-me";
  view?: "list" | "grid";
  /** Remembers sort per section. */
  prefsKey?: string;
}

export const LiveListView = React.memo(function LiveListView({
  headlineText = "My Files",
  parent,
  showHeadline = true,
  defaultSortField = "modified",
  collapsible = true,
  mode = "folder-contents",
  creationParent,
  view,
  prefsKey,
}: LiveListViewProps) {
  const { documents, isLoading } = useDocuments(parent, mode);

  return (
    <ListView
      headlineText={headlineText}
      items={documents}
      creationParent={creationParent}
      showHeadline={showHeadline}
      defaultSortField={defaultSortField}
      collapsible={collapsible}
      isLoading={isLoading}
      mode={mode}
      parent={parent}
      enableBulkSelection
      view={view}
      prefsKey={prefsKey}
    />
  );
});
