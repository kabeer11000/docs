"use client";

import { useStore } from "@nanostores/react";
import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { useFolderDrop } from "@/components/shared/files/file-item";
import { Button } from "@/components/ui/button";
import { useFolderBreadcrumbs } from "@/hooks/use-folder-breadcrumbs";
import { cn } from "@/lib/utils";
import { $auth } from "@/state/auth";
import { searchActions } from "@/state/search";
import { NotificationsPopover } from "../notifications-popover";
import { AccountPopover } from "./account-popover";
import { SearchField } from "./command-palette";
import { folderFromPath, NewMenu } from "./new-menu";

interface Crumb {
  label: string;
  href?: string;
  /** Folder files can be dropped on ("root" is the Vault). */
  folderId?: string;
}

/** Fixed places by route; folders are resolved live. */
const PLACES: [RegExp, Crumb][] = [
  [/^\/home/, { label: "Home", href: "/home" }],
  [/^\/vault/, { label: "Vault", href: "/vault", folderId: "root" }],
  [/^\/shared/, { label: "Shared with me", href: "/shared" }],
  [/^\/trash/, { label: "Trash", href: "/trash" }],
  [/^\/document\/[^/]+\/templates/, { label: "Templates" }],
  [/^\/settings\/api/, { label: "API keys" }],
];

/** Slim navigation bar for the workspace: where you are, search, New, and you. */
export function TopBar({ scrolled }: { scrolled: boolean }) {
  const pathname = usePathname() ?? "";

  return (
    <header
      className={cn(
        "relative z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 transition-[border-color] duration-200 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,34rem)_minmax(0,1fr)] md:gap-4 md:px-5",
        scrolled ? "border-border" : "border-transparent",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <Link
          href="/home"
          aria-label="Docs home"
          className="press flex shrink-0 items-center gap-2 rounded-[10px] p-1 text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          <LogoMark className="size-7" />
        </Link>
        <Breadcrumb pathname={pathname} />
      </div>

      <SearchField />

      <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground md:hidden"
          aria-label="Search"
          onClick={() => searchActions.open()}
        >
          <Search />
        </Button>
        <NewMenu />
        <NotificationsPopover />
        <AccountPopover />
      </div>
    </header>
  );
}

function Breadcrumb({ pathname }: { pathname: string }) {
  const folderId = folderFromPath(pathname);
  if (folderId) return <FolderTrail folderId={folderId} />;
  const place = PLACES.find(([re]) => re.test(pathname))?.[1];
  return place ? <Trail crumbs={[place]} /> : null;
}

function FolderTrail({ folderId }: { folderId: string }) {
  const { breadcrumbs, isLoading } = useFolderBreadcrumbs(folderId);
  if (isLoading && breadcrumbs.length === 0) {
    return (
      <div className="ml-1 h-3.5 w-32 rounded bg-muted" aria-hidden="true" />
    );
  }
  return (
    <Trail
      crumbs={breadcrumbs.map((b, i) => ({
        label: b.name,
        href: i === 0 ? "/vault" : `/folder/${b.id}`,
        folderId: i === 0 ? "root" : b.id,
      }))}
    />
  );
}

/** On small screens only the current place shows. Folder crumbs take dropped files. */
function Trail({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-0.5 text-sm">
        {crumbs.map((crumb, i) => (
          <CrumbItem
            key={`${crumb.label}-${i}`}
            crumb={crumb}
            last={i === crumbs.length - 1}
          />
        ))}
      </ol>
    </nav>
  );
}

function CrumbItem({ crumb, last }: { crumb: Crumb; last: boolean }) {
  const { user } = useStore($auth);
  const folderId = crumb.folderId === "root" ? user?.id : crumb.folderId;
  const { over, dropProps } = useFolderDrop(folderId);
  return (
    <li
      className={cn("flex min-w-0 items-center", !last && "hidden sm:flex")}
      {...dropProps}
    >
      <ChevronRight
        className="mx-0.5 size-3.5 shrink-0 text-muted-foreground/60"
        aria-hidden="true"
      />
      {last || !crumb.href ? (
        <span
          aria-current={last ? "page" : undefined}
          title={crumb.label}
          className={cn(
            "max-w-[16rem] truncate rounded-[6px] px-1.5 py-0.5 transition-colors",
            last ? "font-medium text-foreground" : "text-muted-foreground",
            over && "bg-accent ring-2 ring-foreground/40",
          )}
        >
          {crumb.label}
        </span>
      ) : (
        <Link
          href={crumb.href}
          title={crumb.label}
          className={cn(
            "max-w-[12rem] truncate rounded-[6px] px-1.5 py-0.5 text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
            over && "bg-accent text-foreground ring-2 ring-foreground/40",
          )}
        >
          {crumb.label}
        </Link>
      )}
    </li>
  );
}
