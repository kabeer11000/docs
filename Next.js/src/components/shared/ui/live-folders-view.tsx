import { useStore } from "@nanostores/react";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useFolders } from "@/hooks/use-folders";
import { $auth } from "@/state/auth";
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
  const { createFolder } = useCloudStore();
  const { user } = useStore($auth);

  const handleCreateFolder = async () => {
    if (!user) return;

    const parentFolder = parent || user.id;
    const folderId = await createFolder({
      folderId: parentFolder,
      name: "Untitled Folder",
    });

    if (folderId) {
      // Navigate to the newly created folder
      window.location.href = `/folder/${folderId}`;
    }
  };

  return (
    <FoldersView
      headlineText={headlineText}
      folders={folders}
      onFolderOpen={(folder) => {
        window.location.href = `/folder/${folder.id}`;
      }}
      onCreateFolder={handleCreateFolder}
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
