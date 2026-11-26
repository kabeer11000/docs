import { useStore } from "@nanostores/react";
import {
  ChevronDown,
  ChevronsUpDown,
  FileText,
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
import { useEffect, useState } from "react";
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
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { templatesHref } from "../empty-state";
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

  const handleNewDocument = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!canCreate || !user) return;
    // The templates page creates the document once a template (or blank) is picked.
    if (isMobile) setOpenMobile(false);
    router.push(templatesHref(folderId || user.id));
  };

  return (
    <Sidebar collapsible="offcanvas" {...props} className="border-r-0">
      <SidebarHeader className="gap-3 px-3 pt-3 pb-2">
        <div className="flex h-8 items-center justify-between">
          <Link
            href="/home"
            onClick={() => onNavigate("/home")}
            className="flex items-center gap-2 rounded-md px-1 text-foreground"
          >
            <LogoMark className="size-6" />
            <span className="font-serif text-[17px] font-semibold tracking-[-0.01em]">
              Docs
            </span>
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

        <div className="flex" data-tour="new-document">
          <Button
            className="flex-1 justify-start rounded-r-none"
            onClick={(e) => handleNewDocument(e)}
            disabled={!canCreate}
          >
            <PlusIcon />
            New document
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                className="rounded-l-none border-l border-primary-foreground/20"
                aria-label="More create options"
                disabled={!canCreate}
              >
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => handleNewDocument(e)}>
                <LayoutTemplate />
                Browse templates
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleNewFolder(e)}>
                <FolderPlus />
                New folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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
          <kbd className="ml-auto hidden rounded border md:inline border-border bg-card px-1.5 font-sans text-[11px] leading-5 text-muted-foreground">
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
          <h3 className="mb-1 px-2 text-xs font-medium text-muted-foreground">
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
        <div className="flex gap-3 px-2 text-xs text-muted-foreground">
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
  "relative flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

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
        active &&
          "font-medium text-foreground before:absolute before:top-2 before:bottom-2 before:-left-1 before:w-0.5 before:rounded-full before:bg-primary",
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
      <p className="px-2 py-1 text-xs text-muted-foreground">
        Star documents and folders to find them here.
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
            className="h-7"
          >
            <Folder className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {folder.name || folder.title || "Folder"}
            </span>
          </NavLink>
        );
      })}
      {/* Documents open with a full load, like everywhere else in the app. */}
      {docs?.map((doc) => (
        <a
          key={doc.id}
          href={`/document/${doc.id}`}
          className={cn(navItemClass, "h-7")}
        >
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{doc.title || "Untitled document"}</span>
        </a>
      ))}
    </div>
  );
}

const FREE_FILE_LIMIT = 200;

export function AccountStorage({ userId }: { userId?: string }) {
  const count = useStore(userId ? ownedCountWatch(userId) : $nothing);
  const size = count ?? 0;
  const pct = 100 * (Math.min(size, FREE_FILE_LIMIT) / FREE_FILE_LIMIT);
  return (
    <div className="px-2">
      <p className="text-xs tabular-nums text-muted-foreground">
        {count === undefined ? " " : `${size} of ${FREE_FILE_LIMIT} files`}
      </p>
      <div
        className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Files used"
        aria-valuenow={size}
        aria-valuemin={0}
        aria-valuemax={FREE_FILE_LIMIT}
      >
        <div
          className="h-full bg-primary transition-all"
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
      <div className="flex h-10 items-center gap-2.5 px-2" aria-hidden="true">
        <div className="size-7 rounded-full bg-muted" />
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
        className="flex h-10 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm text-foreground transition-colors hover:bg-accent data-[state=open]:bg-accent"
      >
        <Avatar className="size-7 bg-muted">
          <AvatarImage src={user.photoURL || "/avatars/avatar-3.png"} alt="" />
          <AvatarFallback className="text-xs">
            {getUserInitials(user) || "U"}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
    </AccountPopover>
  );
}
