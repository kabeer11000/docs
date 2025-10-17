/**
 * Convert a file or folder name to a URL-friendly slug
 */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters except spaces and hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Convert a slug back to search for matching files/folders
 */
export function slugToSearchPattern(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Find file by slug in files array
 */
export function findFileBySlug(files: any[], slug: string): any | null {
  return files.find((file) => nameToSlug(file.name) === slug) || null;
}

/**
 * Find folder by slug in folders array
 */
export function findFolderBySlug(folders: any[], slug: string): any | null {
  return folders.find((folder) => nameToSlug(folder.name) === slug) || null;
}

/**
 * Generate file URL based on file name
 */
export function generateFileUrl(fileName: string): string {
  return `/file/${nameToSlug(fileName)}`;
}

/**
 * Generate folder URL based on folder name
 */
export function generateFolderUrl(folderName: string): string {
  return `/folder/${nameToSlug(folderName)}`;
}
