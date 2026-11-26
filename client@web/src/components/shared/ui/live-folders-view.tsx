import { useFolders } from "@/hooks/use-folders";
import { FoldersView } from "./folders-view";

interface LiveFoldersViewProps {
  headlineText?: string;
  showHeadline?: boolean;
  defaultSortField?: "name" | "modified" | "size" | "created";
  collapsible?: boolean;
  parent?: string; // parent-folder.id
  sortable?: boolean;
  creationParent?: string; // parent folder when creating
  mode?: "recent-folders" | "folder-contents";
}

export function LiveFoldersView({
  headlineText = "Quick Access",
  parent,
  showHeadline = true,
  collapsible = true,
  mode = "folder-contents",
}: LiveFoldersViewProps) {
  const { folders, isLoading } = useFolders(parent, mode);

  return (
    <FoldersView
      headlineText={headlineText}
      folders={folders}
      onFolderOpen={(folder) => {
        window.location.href = `/folder/${folder.id}`;
      }}
      showHeadline={showHeadline}
      collapsible={collapsible}
      isLoading={isLoading}
      enableContextMenu={true}
      enableDropdownMenu={true}
      enableRename={true}
      enableCopy={false}
      enableDelete={true}
    />
  );
}
