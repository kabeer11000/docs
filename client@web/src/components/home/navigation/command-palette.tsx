import { useStore } from "@nanostores/react";
import { Command as CommandPrimitive } from "cmdk";
import {
  Clock,
  Compass,
  FileText,
  Folder,
  FolderLock,
  LayoutTemplate,
  type LucideIcon,
  Search,
  Star,
  SunMoon,
  Trash2,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCreateFile } from "@/hooks/use-create-file";
import { useSearchData } from "@/hooks/use-search-data";
import { type FileKind, fileHref, fileKind } from "@/lib/files";
import { performSearch } from "@/lib/search";
import { cn } from "@/lib/utils";
import { $auth } from "@/state/auth";
import { $documents } from "@/state/cloudstore-data";
import { $searchOpen, $searchQuery, searchActions } from "@/state/search";
import { templatesHref } from "../empty-state";
import { KIND } from "../kind";

const typeIcon: Record<string, LucideIcon> = {
  file: FileText,
  folder: Folder,
  template: LayoutTemplate,
};

/**
 * Search as a popover under the top-bar field (Spotlight style): Ctrl/Cmd+K or "/" focuses the field in place
 * and the results open right beneath it. No backdrop. `floating` is the editor variant: no field on screen,
 * so the box appears at the top centre only while open.
 */
export function SearchField({ floating = false }: { floating?: boolean }) {
  const open = useStore($searchOpen);
  const query = useStore($searchQuery);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if ($searchOpen.get()) searchActions.close();
        else searchActions.open();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Opened from anywhere (shortcut, mobile button): focus the field. Closed: let go of it.
  useEffect(() => {
    if (open) requestAnimationFrame(() => input.current?.focus());
    else if (document.activeElement === input.current) input.current?.blur();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) searchActions.close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (floating && !open) return null;

  return (
    <div
      ref={root}
      data-tour="search"
      className={cn(
        "relative w-full",
        floating
          ? "fixed top-2 left-1/2 z-50 w-[min(560px,calc(100vw-1rem))] -translate-x-1/2"
          : open
            ? "max-md:fixed max-md:inset-x-2 max-md:top-2 max-md:z-50 max-md:w-auto"
            : "hidden md:block",
      )}
    >
      <Command
        shouldFilter={false}
        loop
        className="overflow-visible rounded-none bg-transparent"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            searchActions.close();
          }
        }}
      >
        <div
          className={cn(
            "flex h-9 items-center gap-2 rounded-[10px] px-3 text-sm transition-colors",
            open || floating
              ? "bg-card shadow-float ring-1 ring-border"
              : "bg-muted/70 text-muted-foreground hover:bg-muted",
          )}
        >
          <Search
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <CommandPrimitive.Input
            ref={input}
            value={query}
            onValueChange={searchActions.setQuery}
            onFocus={() => !$searchOpen.get() && searchActions.open()}
            placeholder="Search files and commands"
            aria-label="Search files and commands"
            className="h-full min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
          {!open && (
            <kbd className="rounded-[6px] border border-border bg-card px-1.5 font-sans text-[11px] leading-5 text-muted-foreground">
              Ctrl K
            </kbd>
          )}
        </div>
        {open && (
          <div className="absolute top-full left-1/2 z-50 mt-2 w-full min-w-[min(560px,calc(100vw-1rem))] -translate-x-1/2 overflow-hidden rounded-[14px] bg-popover text-popover-foreground shadow-float ring-1 ring-border">
            <Results />
          </div>
        )}
      </Command>
    </div>
  );
}

/** Editors have no search field on screen; Ctrl/Cmd+K opens the same box at the top centre. */
export function CommandPalette() {
  return <SearchField floating />;
}

type Entry = {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  /** Tints the icon in an app colour. */
  tint?: string;
  run: () => void;
};

/** Mounted only while open, so the search data is not watched otherwise. */
function Results() {
  const query = useStore($searchQuery);
  const { user } = useStore($auth);
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { resolvedTheme, setTheme } = useTheme();
  const { searchableItems } = useSearchData("home");
  const docs = useStore($documents);
  const kindOf = (id: string) => fileKind(docs.find((d) => d.id === id));

  const folderId =
    pathname.match(/^\/folder\/([^/?#]+)/)?.[1] ?? user?.id ?? "";

  const { create } = useCreateFile();
  const make = (kind: FileKind) => {
    searchActions.close();
    create(kind, folderId);
  };

  const go = (path: string) => {
    searchActions.close();
    router.push(path);
  };

  const actions: Entry[] = [
    ...(["doc", "sheet", "slides"] as const).map((kind) => ({
      id: `new-${kind}`,
      label: `New ${KIND[kind].label.toLowerCase()}`,
      icon: KIND[kind].icon,
      tint: KIND[kind].text,
      run: () => make(kind),
    })),
    {
      id: "templates",
      label: "Browse templates",
      icon: LayoutTemplate,
      run: () => go(templatesHref(folderId)),
    },
    {
      id: "recent",
      label: "Go to Recent",
      icon: Clock,
      run: () => go("/home"),
    },
    {
      id: "starred",
      label: "Go to Starred",
      icon: Star,
      run: () => go("/home?tab=starred"),
    },
    {
      id: "shared",
      label: "Go to Shared with me",
      icon: Users,
      run: () => go("/shared"),
    },
    {
      id: "vault",
      label: "Go to Vault",
      icon: FolderLock,
      run: () => go("/vault"),
    },
    {
      id: "trash",
      label: "Go to Trash",
      icon: Trash2,
      run: () => go("/trash"),
    },
    {
      id: "theme",
      label:
        resolvedTheme === "dark"
          ? "Switch to light theme"
          : "Switch to dark theme",
      icon: SunMoon,
      run: () => {
        searchActions.close();
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
      },
    },
    {
      id: "tour",
      label: "Take the tour",
      icon: Compass,
      run: () => {
        searchActions.close();
        window.dispatchEvent(new Event("docs:start-tour"));
      },
    },
  ];

  const q = query.trim().toLowerCase();

  const toEntry = (r: { id: string; title: string; type: string }): Entry => {
    if (r.type === "file") {
      const kind = kindOf(r.id);
      return {
        id: `file:${r.id}`,
        label: r.title || "Untitled",
        hint: KIND[kind].label,
        icon: KIND[kind].icon,
        tint: KIND[kind].text,
        run: () => go(fileHref(r.id, kind)),
      };
    }
    return {
      id: `${r.type}:${r.id}`,
      label: r.title,
      hint: r.type === "folder" ? "Folder" : "Template",
      icon: typeIcon[r.type] ?? FileText,
      run: () =>
        go(r.type === "folder" ? `/folder/${r.id}` : templatesHref(folderId)),
    };
  };
  // Empty query: recent documents. Otherwise fuzzy matches (lib/search), templates last.
  const results = q
    ? [
        ...performSearch(q, "home", searchableItems),
        ...performSearch(q, "templates").slice(0, 5),
      ].map(toEntry)
    : searchableItems
        .filter((i) => i.type === "file")
        .slice(0, 6)
        .map(toEntry);

  const visibleActions = q
    ? actions.filter((a) => a.label.toLowerCase().includes(q))
    : actions;

  return (
    <CommandList className="max-h-[min(440px,60vh)] p-1">
      <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
        No matches for "{query}".
      </CommandEmpty>
      {results.length > 0 && (
        <CommandGroup heading={q ? "Results" : "Recent"}>
          {results.map((r) => (
            <PaletteItem key={r.id} entry={r} />
          ))}
        </CommandGroup>
      )}
      {visibleActions.length > 0 && (
        <CommandGroup heading="Actions">
          {visibleActions.map((a) => (
            <PaletteItem key={a.id} entry={a} />
          ))}
        </CommandGroup>
      )}
    </CommandList>
  );
}

function PaletteItem({ entry }: { entry: Entry }) {
  return (
    // cmdk marks every item data-disabled="false"; the shared menu style dims on attribute presence.
    <CommandItem
      value={entry.id}
      onSelect={entry.run}
      className="h-8 rounded-[8px] data-[disabled=false]:!pointer-events-auto data-[disabled=false]:!opacity-100"
    >
      <entry.icon className={cn(entry.tint)} />
      <span className="truncate">{entry.label}</span>
      {entry.hint && (
        <span className="ml-auto pl-4 text-xs text-muted-foreground">
          {entry.hint}
        </span>
      )}
    </CommandItem>
  );
}
