import type { IFileItem, IFolderItem } from "@shared-types";

interface FolderData {
  folder: IFolderItem;
  subfolders: IFolderItem[];
  files: IFileItem[];
}

// Map of folder slugs to their data files
const folderDataMap: Record<string, () => Promise<FolderData>> = {
  "constitutional-law-cases": () =>
    import("@/data/home/folders/constitutional-law-cases.json").then(
      (m) => m.default as unknown as FolderData,
    ),
  "criminal-law-research": () =>
    import("@/data/home/folders/criminal-law-research.json").then(
      (m) => m.default as unknown as FolderData,
    ),
  "client-case-files": () =>
    import("@/data/home/folders/client-case-files.json").then(
      (m) => m.default as unknown as FolderData,
    ),
  "legal-templates-forms": () =>
    import("@/data/home/folders/legal-templates-forms.json").then(
      (m) => m.default as unknown as FolderData,
    ),
  "human-rights-cases": () =>
    import("@/data/home/folders/human-rights-cases.json").then(
      (m) => m.default as unknown as FolderData,
    ),
};

export async function getFolderData(
  folderSlug: string,
): Promise<FolderData | null> {
  const loader = folderDataMap[folderSlug];

  if (!loader) {
    console.warn(`No folder data found for slug: ${folderSlug}`);
    return null;
  }

  try {
    return await loader();
  } catch (error) {
    console.error(`Failed to load folder data for ${folderSlug}:`, error);
    return null;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

export function getFileExtensionIcon(extension: string): string {
  const iconMap: Record<string, string> = {
    pdf: "file-text",
    docx: "file-text",
    doc: "file-text",
  };

  return iconMap[extension.toLowerCase()] || "file-text";
}

export function checkPermission(
  permissions: { canRead: boolean; canWrite: boolean; canDelete: boolean },
  action: "read" | "write" | "delete",
): boolean {
  switch (action) {
    case "read":
      return permissions.canRead;
    case "write":
      return permissions.canWrite;
    case "delete":
      return permissions.canDelete;
    default:
      return false;
  }
}
