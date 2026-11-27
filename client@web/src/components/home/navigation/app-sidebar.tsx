import { useStore } from "@nanostores/react";
import {
  ArrowUpFromLine,
  ChevronsUpDown,
  Folder,
  FolderPlus,
  HomeIcon,
  LayoutTemplate,
  LockIcon,
  PanelLeft,
  PlusIcon,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useCreateFile } from "@/hooks/use-create-file";
import { type FileKind, fileHref, fileKind } from "@/lib/files";
import { IMPORT_ACCEPT, useImportFiles } from "@/lib/import/use-import-files";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { $auth, getUserInitials } from "@/state/auth";
import { $nothing, ownedCountWatch, starredWatch } from "@/state/live-queries";
import { searchActions } from "@/state/search";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { templatesHref } from "../empty-state";
import { KIND, KINDS } from "../kind";
import { AccountPopover } from "./account-popover";

const navItems = [
  { title: "Home", url: "/home", icon: HomeIcon, tour: undefined },
  { title: "Vault", url: "/vault", icon: LockIcon, tour: "nav-vault" },
  { title: "Shared with me", url: "/shared", icon: Users, tour: undefined },
];

/** Folder the current page shows, so "New" creates inside it. */
const folderFromPath = (pathname: string) =>
  pathname.match(/^\/folder\/([^/?#]+)/)?.[1];

export function AppSidebar({
  pathname: _pathname,
  folderId: folderIdProp,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  /** Ignored; the sidebar reads the route itself. Kept for older callers. */
  pathname?: string;
  folderId?: string;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { createFolder, isReady } = useCloudStore();
  const { user, isLoading } = useStore($auth);
  const { isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const [isCreating, setIsCreating] = useState(false);
  // Marks the clicked nav item at once instead of when the route commits.
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  useEffect(() => setPendingUrl(null), [pathname]);

  const folderId = folderIdProp ?? folderFromPath(pathname);
  const canCreate = !!user && !isLoading;
  const activeUrl = pendingUrl ?? pathname;

  const onNavigate = (url: string) => {
    setPendingUrl(url);
    if (isMobile) setOpenMobile(false);
  };

  const handleNewFolder = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!isReady || isCreating || !canCreate || !user) return;

    setIsCreating(true);
    try {
      const docId = await createFolder({
        folderId: folderId || user.id,
        name: `Untitled Folder`,
      });
      if (!docId) {
        showToast.error(
          "Failed to create folder",
          "Please check your connection and try again",
        );
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
      showToast.error("Failed to create folder", "An unexpected error occurred");
    } finally {
      // Blocks rapid repeat clicks while the list catches up.
      setTimeout(() => setIsCreating(false), 300);
    }
  };

  const { create, creating } = useCreateFile();
  const newFile = (kind: FileKind) => {
    if (!canCreate || !user) return;
    if (isMobile) setOpenMobile(false);
    create(kind, folderId || user.id);
  };

  const { importFiles, busy: importing } = useImportFiles();
  const importInput = useRef<HTMLInputElement>(null);

  return (
    <Sidebar collapsible="offcanvas" {...props} className="border-r-0">
      <SidebarHeader className="gap-3 px-3 pt-3 pb-2">
        <div className="flex h-9 items-center justify-between">
          <Link
            href="/home"
            onClick={() => onNavigate("/home")}
            className="flex items-center gap-2 rounded-[10px] px-1.5 text-foreground"
          >
            <LogoMark className="size-7" />
            <span className="font-display text-[19px] font-bold tracking-[-0.03em]">Docs</span>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            title="Collapse sidebar (Ctrl+\)"
          >
            <PanelLeft />
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              data-tour="new-document"
              className="h-12 w-full justify-start gap-3 rounded-[14px] pr-4 pl-2 font-display text-[15px] font-semibold tracking-[-0.01em] shadow-card"
              disabled={!canCreate || creating}
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-primary-foreground/15">
                <PlusIcon className="size-[18px]" strokeWidth={2.5} />
              </span>
              New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={6} className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56">
            {KINDS.map((kind) => {
              const k = KIND[kind];
              return (
                <DropdownMenuItem key={kind} onClick={() => newFile(kind)} className="h-9">
                  <k.icon className={k.text} strokeWidth={2.25} />
                  {k.label}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (isMobile) setOpenMobile(false);
                if (user) router.push(templatesHref(folderId || user.id));
              }}
            >
              <LayoutTemplate />
              From template
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleNewFolder(e)}>
              <FolderPlus />
              Folder
            </DropdownMenuItem>
            <DropdownMenuItem disabled={importing} onClick={() => importInput.current?.click()}>
              <ArrowUpFromLine />
              Import file
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={importInput}
          type="file"
          accept={IMPORT_ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length && user) {
              if (isMobile) setOpenMobile(false);
              importFiles(e.target.files, folderId || user.id);
            }
            e.target.value = "";
          }}
        />

        <button
          type="button"
          data-tour="search"
          onClick={() => {
            if (isMobile) setOpenMobile(false);
            searchActions.open();
          }}
          className={cn(navItemClass, "w-full")}
        >
          <Search className="size-4" />
          Search
          <kbd className="ml-auto hidden rounded-[6px] bg-card px-1.5 font-sans text-[11px] leading-5 text-muted-foreground shadow-card md:inline">
            Ctrl K
          </kbd>
        </button>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-3 py-2">
        <nav className="flex flex-col gap-0.5" aria-label="Main">
          {navItems.map((item) => (
            <NavLink
              key={item.url}
              href={item.url}
              active={activeUrl === item.url}
              onClick={() => onNavigate(item.url)}
              data-tour={item.tour}
            >
              <item.icon className="size-4" />
              {item.title}
            </NavLink>
          ))}
        </nav>

        <section className="mt-6" data-tour="starred">
          <h3 className="mb-1.5 px-2.5 text-xs font-medium text-muted-foreground">
            Starred
          </h3>
          <StarredItems
            userId={user?.id}
            activeUrl={activeUrl}
            onNavigate={onNavigate}
          />
        </section>
      </SidebarContent>

      <SidebarFooter className="gap-3 px-3 pb-3">
        <AccountStorage userId={user?.id} />
        <div className="flex gap-3 px-2.5 text-xs text-muted-foreground">
          <a
            href="mailto:kabeer@otherdev.com"
            className="transition-colors hover:text-foreground"
          >
            Donate
          </a>
          <a
            href="https://kabeers.network"
            className="transition-colors hover:text-foreground"
          >
            About
          </a>
        </div>
        <AccountRow />
      </SidebarFooter>
    </Sidebar>
  );
}

const navItemClass =
  "relative flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-sm text-muted-foreground transition-[background-color,color,box-shadow] duration-150 hover:bg-accent hover:text-foreground";

function NavLink({
  active,
  className,
  ...props
}: React.ComponentProps<typeof Link> & { active?: boolean }) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        navItemClass,
        active && "bg-card font-medium text-foreground shadow-card hover:bg-card",
        className,
      )}
      {...props}
    />
  );
}

function StarredItems({
  userId,
  activeUrl,
  onNavigate,
}: {
  userId?: string;
  activeUrl: string;
  onNavigate: (url: string) => void;
}) {
  const docs = useStore(userId ? starredWatch(userId, "documents") : $nothing);
  const folders = useStore(userId ? starredWatch(userId, "folders") : $nothing);

  // First load with nothing cached yet: hold the space quietly.
  if (docs === undefined && folders === undefined) {
    return <div className="mx-2 mt-1 h-3 w-32 rounded bg-muted" />;
  }

  if (!docs?.length && !folders?.length) {
    return (
      <p className="px-2.5 py-1 text-xs leading-relaxed text-muted-foreground">
        Star files and folders to keep them here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {folders?.map((folder) => {
        const url = `/folder/${folder.id}`;
        return (
          <NavLink
            key={folder.id}
            href={url}
            active={activeUrl === url}
            onClick={() => onNavigate(url)}
            className="h-8"
          >
            <Folder className="size-4 shrink-0 fill-current/15 text-muted-foreground" />
            <span className="truncate">
              {folder.name || folder.title || "Folder"}
            </span>
          </NavLink>
        );
      })}
      {docs?.map((doc) => {
        const url = fileHref(doc.id, fileKind(doc));
        const k = KIND[fileKind(doc)];
        return (
          <NavLink key={doc.id} href={url} active={activeUrl === url} onClick={() => onNavigate(url)} className="h-8">
            <k.icon className={cn("size-4 shrink-0", k.text)} strokeWidth={2.25} />
            <span className="truncate">{doc.title || "Untitled"}</span>
          </NavLink>
        );
      })}
    </div>
  );
}

const FREE_FILE_LIMIT = 200;

export function AccountStorage({ userId }: { userId?: string }) {
  const count = useStore(userId ? ownedCountWatch(userId) : $nothing);
  const size = count ?? 0;
  const pct = 100 * (Math.min(size, FREE_FILE_LIMIT) / FREE_FILE_LIMIT);
  return (
    <div className="px-2.5">
      <p className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>Files</span>
        <span className="tabular-nums">{count === undefined ? " " : `${size} of ${FREE_FILE_LIMIT}`}</span>
      </p>
      <div
        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Files used"
        aria-valuenow={size}
        aria-valuemin={0}
        aria-valuemax={FREE_FILE_LIMIT}
      >
        <div
          className="h-full rounded-full bg-foreground/80 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AccountRow() {
  const { user } = useStore($auth);

  if (!user) {
    return (
      <div className="flex h-12 items-center gap-2.5 px-2" aria-hidden="true">
        <div className="size-8 rounded-full bg-muted" />
        <div className="h-3 w-24 rounded bg-muted" />
      </div>
    );
  }

  const name = user.displayName || user.email || "Account";
  return (
    <AccountPopover side="top" align="start">
      <button
        type="button"
        data-tour="account-menu"
        aria-label="Account menu"
        className="flex h-12 w-full items-center gap-2.5 rounded-[12px] px-2 text-left text-sm text-foreground transition-[background-color,box-shadow] hover:bg-card hover:shadow-card data-[state=open]:bg-card data-[state=open]:shadow-card"
      >
        <Avatar className="size-8 bg-muted">
          <AvatarImage src={user.photoURL || "/avatars/avatar-3.png"} alt="" />
          <AvatarFallback className="text-xs font-semibold">
            {getUserInitials(user) || "U"}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{name}</span>
          {user.email && user.email !== name && (
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          )}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
    </AccountPopover>
  );
}
