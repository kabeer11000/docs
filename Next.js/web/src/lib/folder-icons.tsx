import type { IFolderItem } from "@shared-types";
import {
  PiFolder,
  PiFolderLock,
  PiFolderOpen,
  PiFolderPlus,
  PiFolderUser,
} from "react-icons/pi";

// Function to get appropriate icon based on folder properties
export const getFolderIcon = (folder: IFolderItem) => {
  const category = folder.category?.toLowerCase() || "";
  const name = folder.name?.toLowerCase() || "";

  // Check for security/confidential folders
  if (
    category.includes("confidential") ||
    category.includes("private") ||
    name.includes("confidential") ||
    name.includes("private") ||
    category.includes("security")
  ) {
    return PiFolderLock;
  }

  // Check for client/user folders
  if (
    category.includes("client") ||
    category.includes("user") ||
    name.includes("client") ||
    name.includes("user")
  ) {
    return PiFolderUser;
  }

  // Check for new/draft folders (could indicate work in progress)
  if (
    category.includes("draft") ||
    category.includes("new") ||
    name.includes("draft") ||
    name.includes("new") ||
    folder.meta?.fileCount === 0
  ) {
    return PiFolderPlus;
  }

  // Check for active/open projects (recently modified or frequently accessed)
  if (
    (folder.meta as any)?.isActive ||
    (folder.meta as any)?.recentlyAccessed
  ) {
    return PiFolderOpen;
  }

  // Default folder
  return PiFolder;
};

// Component wrapper for easy use
export interface FolderIconProps {
  folder: IFolderItem;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

export function FolderIcon({
  folder,
  className = "w-6 h-6",
  style,
  ...props
}: FolderIconProps) {
  const IconComponent = getFolderIcon(folder);

  return (
    <IconComponent
      style={{ color: folder.meta.color, ...style }}
      className={className}
      {...props}
    />
  );
}
