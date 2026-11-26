import { useStore } from "@nanostores/react";
import cloudStore from "@repo/shadcn-ui/lib/cloudstore";
import { $auth } from "@repo/shadcn-ui/state/auth";
import {
  ChevronDown,
  FileText,
  Folder,
  FolderPlus,
  HomeIcon,
  LayoutTemplate,
  LockIcon,
  PlusIcon,
  Users,
} from "lucide-react";
import type * as React from "react";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { templatesHref } from "../empty-state";

export function AppSidebar({
  pathname,
  folderId,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  pathname: string;
  folderId?: string;
}) {
  const { createDocument, createFolder, isReady } = useCloudStore();
  const authState = useStore($auth);
  const [isCreating, setIsCreating] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Give auth state time to initialize
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsChecking(false);
    }, 100);

    return () => clearTimeout(timeout);
  }, []);

  const handleNewFolder = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (
      !isReady ||
      isCreating ||
      isChecking ||
      !authState.user ||
      authState.isLoading
    )
      return;

    // Additional protection against rapid calls
    setIsCreating(true);
    try {
      const parentFolder = folderId || authState.user.id;
      const docId = await createFolder({
        folderId: parentFolder,
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
      showToast.error(
        "Failed to create folder",
        "An unexpected error occurred",
      );
    } finally {
      // Small delay to ensure UI updates properly before allowing new calls
      setTimeout(() => {
        setIsCreating(false);
      }, 300); // 300ms delay to prevent rapid consecutive calls
    }
  };

  const handleNewDocument = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (isChecking || !authState.user || authState.isLoading) return;

    // Just navigate to templates page - document will be created when template/blank is selected
    window.location.href = templatesHref(folderId || authState.user.id);
  };

  const canCreate = !isChecking && !!authState.user && !authState.isLoading;

  return (
    <Sidebar collapsible="offcanvas" {...props} className="border-r-0">
      <SidebarHeader className="px-3 pt-3 pb-2">
        <a
          href="/home"
          className="flex h-8 items-center gap-2 rounded-md px-1 text-sm font-semibold tracking-tight text-foreground"
        >
          <img src="/assets/icon-192.png" alt="" className="size-6 rounded-md" />
          Docs
        </a>
        <div className="mt-2 flex" data-tour="new-document">
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
      </SidebarHeader>

      <SidebarContent className="gap-0 px-3 py-2">
        <nav className="flex flex-col gap-0.5" aria-label="Main">
          {navItems.map((item) => (
            <NavLink
              key={item.url}
              href={item.url}
              active={pathname === item.url}
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
          <StarredItems />
        </section>
      </SidebarContent>

      <SidebarFooter className="gap-3 px-3 pb-3">
        <AccountStorage />
        <div className="flex flex-col gap-1 px-2 text-xs text-muted-foreground">
          <a
            href="mailto:kabeer@otherdev.com"
            className="w-fit transition-colors hover:text-foreground"
          >
            Donate to Kabeer's Network
          </a>
          <a
            href="https://kabeers.network"
            className="w-fit transition-colors hover:text-foreground"
          >
            About Kabeer's Network
          </a>
          <span className="mt-1 text-[11px] text-muted-foreground/70">
            (c) Libre Docs by Kabeer's Network
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

const navItems = [
  { title: "Home", url: "/home", icon: HomeIcon, tour: undefined },
  { title: "Vault", url: "/vault", icon: LockIcon, tour: "nav-vault" },
  { title: "Shared with me", url: "/shared", icon: Users, tour: undefined },
];

function NavLink({
  active,
  className,
  ...props
}: React.ComponentProps<"a"> & { active?: boolean }) {
  return (
    <a
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        active &&
          "font-medium text-foreground before:absolute before:top-2 before:bottom-2 before:-left-1 before:w-0.5 before:rounded-full before:bg-primary",
        className,
      )}
      {...props}
    />
  );
}

type StarredItem = { id: string; title?: string; name?: string };

function useStarred(collection: "documents" | "folders", ownerField: string) {
  const [items, setItems] = useState<StarredItem[]>([]);
  const authState = useStore($auth);

  useEffect(() => {
    if (!authState.user || authState.isLoading) return;

    let watcher: { stop?: () => void } | null = null;
    try {
      const query = cloudStore.query
        .where(ownerField, "EQUAL", authState.user.id)
        .where("isStarred", "EQUAL", true)
        .orderBy("timestamp.updatedAt", "DESCENDING")
        .limit(10);

      watcher = cloudStore
        .collection(collection)
        .watch(query, (result: { collection?: StarredItem[] }) => {
          if (result?.collection) setItems(result.collection);
        });
    } catch (error) {
      console.error(`Failed to watch starred ${collection}:`, error);
    }

    return () => {
      if (typeof watcher?.stop === "function") watcher.stop();
    };
  }, [authState.user, authState.isLoading, collection, ownerField]);

  return items;
}

function StarredItems() {
  const docs = useStarred("documents", "owner");
  const folders = useStarred("folders", "permissions.owner");

  if (docs.length === 0 && folders.length === 0) {
    return (
      <p className="px-2 py-1 text-xs text-muted-foreground">
        Star documents and folders to find them here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {folders.map((folder) => (
        <NavLink key={folder.id} href={`/folder/${folder.id}`} className="h-7">
          <Folder className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {folder.name || folder.title || "Folder"}
          </span>
        </NavLink>
      ))}
      {docs.map((doc) => (
        <NavLink key={doc.id} href={`/document/${doc.id}`} className="h-7">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{doc.title || "Untitled document"}</span>
        </NavLink>
      ))}
    </div>
  );
}

const FREE_FILE_LIMIT = 200;

export function AccountStorage() {
  const [size, setSize] = useState(0);
  const authState = useStore($auth);
  useEffect(() => {
    if (!authState.user || authState.isLoading) return;
    cloudStore
      .collection("documents")
      .watch(
        cloudStore.query
          .where("owner", "EQUAL", authState.user.id)
          .orderBy("timestamp.updatedAt", "DESCENDING"),
        (d: any) => {
          if (d.error) return;
          setSize(d.collection.length);
        },
      );
  }, [authState.user, authState.isLoading]);
  const pct = 100 * (Math.min(size, FREE_FILE_LIMIT) / FREE_FILE_LIMIT);
  return (
    <div className="px-2">
      <p className="text-xs text-muted-foreground">
        {size} of {FREE_FILE_LIMIT} files
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
