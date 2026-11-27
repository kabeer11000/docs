import type { Document, IFolderItem } from "@shared-types";
import { nanoid } from "nanoid";
import { docHtml } from "./content";
import type { Access, ApiUser } from "./permissions";

export type FileKind = "doc" | "sheet" | "slides" | "pdf";

const DEFAULT_TITLE: Record<FileKind, string> = {
  doc: "Untitled document",
  sheet: "Untitled spreadsheet",
  slides: "Untitled presentation",
  pdf: "Untitled PDF",
};

/** Same shape useCloudStore().createDocument inserts, so the app opens API-created files unchanged. */
export function newDocument(
  user: ApiUser & { displayName?: string | null },
  input: {
    kind: FileKind;
    title?: string;
    parent: string;
    html?: string;
    wordCount?: number;
    data?: unknown;
  },
): Document {
  // ISO strings: cloudstore sends documents as JSON, so app-created dates are stored as strings too.
  const now = new Date().toISOString();
  return {
    id: nanoid(),
    ...(input.kind === "doc"
      ? {}
      : { kind: input.kind, data: input.data ?? null }),
    title: input.title || DEFAULT_TITLE[input.kind],
    pages: [
      {
        id: nanoid(),
        content: input.html ?? { type: "doc", content: [] },
        format: "Letter",
        pageNumber: 1,
      },
    ],
    currentPage: 1,
    wordCount: input.wordCount ?? 0,
    owner: user.id,
    sharing: {
      isShared: false,
      sharedWith: [
        {
          userId: user.id,
          email: user.email || "",
          displayName: user.displayName || user.email || null,
          access: "owner",
          status: "active",
          invitedAt: now,
        },
      ],
      settings: {
        allowEditorsShare: true,
        editorsCanDownload: true,
        viewersCanDownload: true,
      },
    },
    permissions: {
      canRead: true,
      canWrite: true,
      canDelete: true,
      canShare: true,
    },
    location: input.parent,
    parents: [input.parent],
    tags: [],
    meta: { type: { mime: "application/json", extension: "json" }, size: 0 },
    pageSettings: {
      pageSize: "Letter",
      orientation: "portrait",
      marginTop: 72,
      marginBottom: 72,
      marginLeft: 72,
      marginRight: 72,
    },
    createdAt: now,
    updatedAt: now,
    lastSaved: now,
  };
}

/** Same shape useCloudStore().createFolder inserts. */
export function newFolder(
  user: ApiUser,
  input: { name: string; parent: string },
): IFolderItem {
  const now = new Date().toISOString();
  return {
    id: nanoid(),
    name: input.name,
    tags: [],
    category: "general",
    parents: [input.parent],
    meta: { fileCount: 0, color: "hsl(142.1 76.2% 36.3%)", icon: "folder" },
    permissions: {
      owner: user.id,
      canRead: true,
      canWrite: true,
      canDelete: true,
      sharedWith: [],
    },
    timestamp: { createdAt: now, updatedAt: now },
    isStarred: false,
  };
}

export const fileKind = (doc: Pick<Document, "kind">): FileKind =>
  doc.kind ?? "doc";

/** Mongo filter for a kind; docs created before sheets/slides have no kind field. */
export const kindFilter = (kind: FileKind) =>
  kind === "doc" ? { kind: { $in: [null, "doc"] } } : { kind };

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : (d ?? null));

/** Public file shape. `full` adds the content: HTML for docs, the stored data for sheets and slides. */
export function serializeFile(doc: Document, access: Access, full = false) {
  const kind = fileKind(doc);
  const base = {
    id: doc.id,
    kind,
    title: doc.title,
    owner: doc.owner,
    folderId: doc.parents?.[0] ?? doc.location ?? null,
    access,
    wordCount: kind === "doc" ? (doc.wordCount ?? 0) : undefined,
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
  };
  if (!full) return base;
  return kind === "doc"
    ? { ...base, content: docHtml(doc.pages?.[0]?.content) }
    : { ...base, data: doc.data ?? null };
}

export function serializeFolder(f: IFolderItem) {
  return {
    id: f.id,
    name: f.name,
    parentId: f.parents?.[0] ?? null,
    createdAt: iso(f.timestamp?.createdAt),
    updatedAt: iso(f.timestamp?.updatedAt),
  };
}

/** Mongo filter for rows not in Trash ({ field: null } matches a missing field too). */
export const notTrashed = { trashedAt: null } as const;

/** What DELETE sets to move a file to Trash; the app's Trash view restores or purges it. */
export const trashFields = (
  doc: Pick<Document, "parents" | "location">,
  now = new Date(),
) => ({
  trashedAt: now.toISOString(),
  trashedFrom: doc.parents?.at(-1) ?? doc.location,
});

/** Case-insensitive "title contains" filter with the user's text taken literally. */
export const titleSearch = (q: string) => ({
  title: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
});
