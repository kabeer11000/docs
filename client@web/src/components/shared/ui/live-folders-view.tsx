import { useFolders } from "@/hooks/use-folders";
import { FoldersView } from "./folders-view";

interface LiveFoldersViewProps {
  headlineText?: string;
  showHeadline?: boolean;
  collapsible?: boolean;
  parent?: string; // parent-folder.id
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
      showHeadline={showHeadline}
      collapsible={collapsible}
      isLoading={isLoading}
    />
  );
}
