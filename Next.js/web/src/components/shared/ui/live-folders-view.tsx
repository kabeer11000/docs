import { useFolders } from "@/hooks/use-folders";
import { FoldersView } from "./folders-view";

interface LiveListViewProps {
  headlineText?: string;
  showHeadline?: boolean;
  defaultSortField?: "name" | "modified" | "size" | "created";
  collapsible?: boolean;
  parent?: string; // parent-folder.id
  sortable?: boolean;
  mode?: "recent-folders" | "folder-contents";
}

export function LiveFoldersView({
  headlineText = "Quick Access",
  parent,
  showHeadline = true,
  defaultSortField = "modified",
  collapsible = true,
  sortable = true,
  mode = "folder-contents",
}: LiveListViewProps) {
  const { folders, isLoading } = useFolders(parent, mode);

  return (
    <FoldersView
      headlineText={headlineText}
      folders={folders}
      onFolderOpen={(folder) => {
        window.location.href = `/folder/${folder.id}`;
      }}
      showHeadline={showHeadline}
      isLoading={isLoading}
      enableContextMenu={true}
      enableDropdownMenu={true}
      enableRename={true}
      enableShare={true}
      enableCopy={false}
      enableDownload={true}
      enableDelete={true}
    />
  );
}
