"use client";

import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useFolderBreadcrumbs } from "@/hooks/use-folder-breadcrumbs";
import { cn } from "@/lib/utils";
import { searchActions } from "@/state/search";
import { NotificationsPopover } from "../notifications-popover";
import { AccountPopover } from "./account-popover";
import { folderFromPath, NewMenu } from "./new-menu";

interface Crumb {
  label: string;
  href?: string;
}

/** Fixed places by route; folders are resolved live. */
const PLACES: [RegExp, Crumb][] = [
  [/^\/home/, { label: "Home", href: "/home" }],
  [/^\/vault/, { label: "Vault", href: "/vault" }],
  [/^\/shared/, { label: "Shared with me", href: "/shared" }],
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

      <button
        type="button"
        data-tour="search"
        onClick={() => searchActions.open()}
        className="hidden h-9 w-full items-center gap-2.5 rounded-[10px] bg-muted/70 px-3 text-left text-sm text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40 md:flex"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate">Search files and commands</span>
        <kbd className="rounded-[6px] border border-border bg-card px-1.5 font-sans text-[11px] leading-5">
          Ctrl K
        </kbd>
      </button>

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
      }))}
    />
  );
}

/** On small screens only the current place shows. */
function Trail({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-0.5 text-sm">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li
              key={`${crumb.label}-${i}`}
              className={cn(
                "flex min-w-0 items-center",
                !last && "hidden sm:flex",
              )}
            >
              <ChevronRight
                className="mx-0.5 size-3.5 shrink-0 text-muted-foreground/60"
                aria-hidden="true"
              />
              {last || !crumb.href ? (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn(
                    "truncate px-1",
                    last
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="max-w-[12rem] truncate rounded-[6px] px-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
