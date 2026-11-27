"use client";

import { useStore } from "@nanostores/react";
import type { Document } from "@shared-types";
import { ChevronLeft, Folder, Star, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { LogoMark } from "@/components/brand/logo";
import { CollaborationAvatars } from "@/components/editor/collaboration-avatars";
import { EditableTitle } from "@/components/editor/editable-title";
import { KIND, KindIcon } from "@/components/home/kind";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useCreateFile } from "@/hooks/use-create-file";
import type { DocumentPermissions } from "@/hooks/use-document-permissions";
import { useFolderBreadcrumbs } from "@/hooks/use-folder-breadcrumbs";
import { type FileKind, fileHref } from "@/lib/files";
import { IMPORT_ACCEPT, useImportFiles } from "@/lib/import/use-import-files";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { $auth } from "@/state/auth";
import { trash as moveToTrash } from "@/state/file-actions";
import { parentOf } from "@/state/file-logic";
import { Menubar, OverflowMenu } from "./menubar";
import type { AppMenu, FileCtx, MenuEntry } from "./menus";

const ShareDialog = lazy(() =>
  import("@/components/editor/share-dialog").then((m) => ({
    default: m.ShareDialog,
  })),
);

export type SaveState = "idle" | "saving" | "saved" | "error";
export interface SaveStatus {
  state: SaveState;
  /** Why the last save failed. */
  error?: string | null;
  lastSaved?: Date | null;
}

/** The folder a file sits in (rows carry parents/location; the Document type does not declare them). */
const folderOf = (doc: Document) => {
  const id = parentOf(doc as { parents?: string[]; location?: string });
  return id === "my-drive" ? undefined : id; // legacy default, means the root
};

const APP_NAME: Record<FileKind, string> = {
  doc: "Docs",
  sheet: "Sheets",
  slides: "Slides",
  pdf: "PDF",
};

export interface AppHeaderProps {
  kind: FileKind;
  doc: Document | null;
  permissions: DocumentPermissions;
  status: SaveStatus;
  /** The app's menus, built from the shared file actions. */
  menus: (file: FileCtx) => AppMenu[];
  /** Replaces the save status when there is something more important to say ("Locked for signing"). */
  note?: string;
  /** Extra controls before Share (comments, signatures). Hidden on phones. */
  actions?: ReactNode;
  /** The app's own main action next to Share (Present). Hidden on phones; put it in `overflowLead` too. */
  primary?: ReactNode;
  /** Items at the top of the narrow-screen "..." menu. */
  overflowLead?: MenuEntry[];
  /** Extra rows for the Details dialog, read when it opens. */
  details?: () => [string, string][];
}

/** One title bar for documents, spreadsheets and presentations. */
export function AppHeader({
  kind,
  doc,
  permissions,
  status,
  menus,
  note,
  actions,
  primary,
  overflowLead,
  details,
}: AppHeaderProps) {
  const router = useRouter();
  const { user } = useStore($auth);
  const { updateDocument, duplicateDocument } = useCloudStore();
  const { create } = useCreateFile();
  const { importFiles } = useImportFiles();
  const [renaming, setRenaming] = useState(false);
  const [share, setShare] = useState<"closed" | "open" | "mounted">("closed");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  const title = doc?.title;
  useEffect(() => {
    if (title) document.title = `${title} - ${APP_NAME[kind]}`;
  }, [title, kind]);

  const makeCopy = useCallback(async () => {
    if (!doc) return;
    const id = await duplicateDocument(doc.id).catch(() => null);
    if (!id)
      return showToast.error(
        "Could not make a copy",
        "Check your connection and try again.",
      );
    showToast.success("Copy created");
    router.push(fileHref(id, kind));
  }, [doc, duplicateDocument, router, kind]);

  const toggleStar = useCallback(async () => {
    if (!doc) return;
    const starred = !doc.isStarred;
    const ok = await updateDocument(doc.id, {
      isStarred: starred,
      updatedAt: new Date().toISOString(),
    }).catch(() => false);
    if (!ok)
      showToast.error(
        starred ? "Could not star" : "Could not unstar",
        "Check your connection and try again.",
      );
  }, [doc, updateDocument]);

  // The document toolbar and command palette ask for these by event.
  useEffect(() => {
    const copy = () => void makeCopy();
    const star = () => void toggleStar();
    window.addEventListener("document-copy-requested", copy);
    window.addEventListener("document-star-requested", star);
    return () => {
      window.removeEventListener("document-copy-requested", copy);
      window.removeEventListener("document-star-requested", star);
    };
  }, [makeCopy, toggleStar]);

  if (!doc) return <AppHeaderSkeleton />;

  // Same soft delete as Home (with its Undo toast), then back to the files.
  const trash = async () => {
    await moveToTrash([{ id: doc.id, type: "file" }]);
    router.push("/home");
  };

  const isOwner = !!user && doc.owner === user.id;
  const folderId = isOwner ? folderOf(doc) : undefined;
  const file: FileCtx = {
    kind,
    canEdit: permissions.canEdit,
    canRename: permissions.canRename,
    canShare: permissions.canShare,
    canDelete: permissions.canDelete,
    canDownload: permissions.canDownload,
    newFile: (k) => void create(k, folderId),
    importFile: () =>
      void pickFiles(IMPORT_ACCEPT, true).then((files) =>
        importFiles(files, folderId),
      ),
    makeCopy: () => void makeCopy(),
    share: () => setShare("open"),
    rename: () => setRenaming(true),
    details: () => setDetailsOpen(true),
    trash: () => setTrashOpen(true),
  };
  const buildMenus = () => menus(file);
  const hasMenus = buildMenus().length > 0;

  return (
    <div
      data-app={kind}
      className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2"
    >
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          <Link
            href="/home"
            aria-label="All files"
            className="press group flex h-9 shrink-0 items-center gap-0.5 rounded-[10px] pr-1.5 pl-0.5 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <ChevronLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <LogoMark className="size-[18px] opacity-70 transition-opacity group-hover:opacity-100" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom">All files</TooltipContent>
      </Tooltip>

      <KindIcon
        kind={kind}
        className="hidden size-9 rounded-[10px] sm:inline-flex [&>svg]:size-[19px]"
      />

      <div className="flex min-w-0 flex-col justify-center">
        <div className="flex min-w-0 items-center gap-0.5">
          <EditableTitle
            title={doc.title}
            documentId={doc.id}
            canRename={permissions.canRename}
            editing={renaming}
            onEditingChange={setRenaming}
            placeholder={`Untitled ${KIND[kind].label.toLowerCase()}`}
            className="max-w-[min(34rem,46vw)]"
          />
          <StarButton
            starred={!!doc.isStarred}
            onToggle={() => void toggleStar()}
          />
        </div>
        <div className="-mt-px flex h-[22px] min-w-0 items-center gap-2">
          {hasMenus && (
            <Menubar build={buildMenus} className="-ml-px hidden md:flex" />
          )}
          <Location
            doc={doc}
            isOwner={isOwner}
            className={cn(
              "pl-1.5",
              hasMenus && "md:hidden xl:inline-flex xl:pl-0",
            )}
          />
          <StatusWord
            status={status}
            note={note ?? (permissions.canEdit ? undefined : "View only")}
          />
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <CollaborationAvatars />
        {actions && (
          <div className="hidden items-center gap-1 sm:flex">{actions}</div>
        )}
        {primary && <div className="hidden sm:flex">{primary}</div>}
        {permissions.canShare && (
          <Button
            data-tour="share-button"
            variant="app"
            onClick={() => setShare("open")}
            aria-label="Share"
            className="h-9 rounded-full px-2.5 sm:px-4"
          >
            <UserPlus className="sm:hidden" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        )}
        <OverflowMenu
          build={buildMenus}
          lead={overflowLead}
          className="md:hidden"
        />
      </div>

      {share !== "closed" && (
        <Suspense fallback={null}>
          <ShareDialog
            open={share === "open"}
            onOpenChange={(o) => setShare(o ? "open" : "mounted")}
            document={doc}
          />
        </Suspense>
      )}
      <DetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        rows={() => [
          ["Type", KIND[kind].label],
          ["Owner", isOwner ? "You" : "Someone else, shared with you"],
          ["Created", formatDate(doc.createdAt)],
          ["Modified", formatDate(doc.updatedAt)],
          ...(details?.() ?? []),
        ]}
        title={doc.title || "Untitled"}
      />
      <ConfirmationDialog
        open={trashOpen}
        onOpenChange={setTrashOpen}
        title="Move to trash?"
        description={`"${doc.title || "Untitled"}" will be removed from your files and from everyone it is shared with.`}
        confirmText="Move to trash"
        variant="destructive"
        onConfirm={() => void trash()}
      />
    </div>
  );
}

function StarButton({
  starred,
  onToggle,
}: {
  starred: boolean;
  onToggle: () => void;
}) {
  return (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onToggle}
          aria-label={starred ? "Remove from starred" : "Add to starred"}
          aria-pressed={starred}
          className="press hidden size-6 shrink-0 items-center justify-center rounded-[6px] text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 sm:flex"
        >
          <Star
            className={cn(
              "size-[15px] transition-transform duration-200 motion-reduce:transition-none",
              starred &&
                "scale-110 fill-amber-400 text-amber-500 dark:fill-amber-300 dark:text-amber-400",
            )}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {starred ? "Starred" : "Star"}
      </TooltipContent>
    </Tooltip>
  );
}

/** Where the file lives: its folder, the vault, or "Shared with you". Links there. */
function Location({
  doc,
  isOwner,
  className,
}: {
  doc: Document;
  isOwner: boolean;
  className?: string;
}) {
  const { user } = useStore($auth);
  const folderId = folderOf(doc);
  const inFolder = isOwner && !!folderId && folderId !== user?.id;
  const { breadcrumbs } = useFolderBreadcrumbs(inFolder ? folderId : undefined);
  const place = !isOwner
    ? { href: "/shared", name: "Shared with you", Icon: Users }
    : inFolder
      ? breadcrumbs.length
        ? {
            href: `/folder/${folderId}`,
            name: breadcrumbs[breadcrumbs.length - 1].name,
            Icon: Folder,
          }
        : null
      : { href: "/vault", name: "Vault", Icon: Folder };
  if (!place) return null;
  return (
    <Link
      href={place.href}
      className={cn(
        "inline-flex min-w-0 shrink items-center gap-1 rounded-[5px] text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40",
        className,
      )}
    >
      <place.Icon className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{place.name}</span>
    </Link>
  );
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
const useOnline = () =>
  useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );

const LOOK = {
  saving: {
    word: "Saving...",
    dot: "bg-app animate-pulse motion-reduce:animate-none",
  },
  saved: { word: "Saved", dot: "bg-emerald-500 dark:bg-emerald-400" },
  error: { word: "Not saved", dot: "bg-destructive" },
  offline: {
    word: "Offline, changes kept",
    dot: "bg-amber-500 dark:bg-amber-400",
  },
} as const;

/** A dot and a word that cross-fade as the save state changes. */
function StatusWord({ status, note }: { status: SaveStatus; note?: string }) {
  const online = useOnline();
  const key = !online
    ? "offline"
    : status.state === "idle"
      ? null
      : status.state;
  if (!key && !note) return null;
  if (!key)
    return (
      <span className="shrink-0 truncate text-xs text-muted-foreground">
        {note}
      </span>
    );
  const look = LOOK[key];
  const time = status.lastSaved?.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const hint =
    key === "error"
      ? status.error || "Your latest changes could not be saved. Retrying."
      : key === "saved" && time
        ? `Saved at ${time}`
        : key === "offline"
          ? "Your edits stay on this device and sync when you reconnect"
          : null;
  const label = (
    <output
      aria-live="polite"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 text-xs",
        key === "error"
          ? "font-medium text-destructive"
          : "text-muted-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full transition-colors duration-300",
          look.dot,
        )}
      />
      <span
        key={key}
        className="animate-in fade-in slide-in-from-bottom-0.5 duration-200 motion-reduce:animate-none"
      >
        {look.word}
      </span>
    </output>
  );
  if (!hint) return label;
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{label}</TooltipTrigger>
      <TooltipContent side="bottom">{hint}</TooltipContent>
    </Tooltip>
  );
}

const formatDate = (d: Date | string | undefined) => {
  const date = d ? new Date(d) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
    : "Unknown";
};

function DetailsDialog({
  open,
  onOpenChange,
  title,
  rows,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  rows: () => [string, string][];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="truncate font-display">{title}</DialogTitle>
        </DialogHeader>
        {open && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[13px]">
            {rows().map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right tabular-nums text-foreground">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Same footprint as the header while the file loads, so nothing jumps. */
export function AppHeaderSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="h-9 w-10 shrink-0" />
      <div className="hidden size-9 shrink-0 animate-pulse rounded-[10px] bg-muted sm:block" />
      <div className="flex flex-col gap-1.5">
        <div className="h-4 w-44 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-64 max-w-[50vw] animate-pulse rounded-full bg-muted/70" />
      </div>
      <div className="ml-auto h-9 w-20 animate-pulse rounded-full bg-muted" />
    </div>
  );
}

/** Opens the system file picker; resolves with the chosen files (empty when cancelled). */
export function pickFiles(accept: string, multiple = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement("input"), {
      type: "file",
      accept,
      multiple,
    });
    input.addEventListener("change", () =>
      resolve(Array.from(input.files ?? [])),
    );
    input.addEventListener("cancel", () => resolve([]));
    input.click();
  });
}

/**
 * Sends a keyboard shortcut to the page, for menu items whose action is already bound to that
 * shortcut by the app (the menu then does exactly what the keys do).
 * ponytail: relies on the app listening on document/window keydown; switch to a command store if
 * those listeners ever move onto a specific element.
 */
export function pressShortcut(key: string, init: KeyboardEventInit = {}) {
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
}
