import { useStore } from "@nanostores/react";
import {
  Compass,
  FileText,
  Folder,
  FolderLock,
  LayoutTemplate,
  type LucideIcon,
  SunMoon,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { useCreateFile } from "@/hooks/use-create-file";
import { type FileKind, fileHref, fileKind } from "@/lib/files";
import { cn } from "@/lib/utils";
import { $documents } from "@/state/cloudstore-data";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSearchData } from "@/hooks/use-search-data";
import { performSearch } from "@/lib/search";
import { $auth } from "@/state/auth";
import { $searchOpen, $searchQuery, searchActions } from "@/state/search";
import { templatesHref } from "../empty-state";
import { KIND } from "../kind";

const typeIcon: Record<string, LucideIcon> = {
  file: FileText,
  folder: Folder,
  template: LayoutTemplate,
};

/** Ctrl/Cmd+K: search documents, folders and templates, or run an action. */
export function CommandPalette() {
  const open = useStore($searchOpen);

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

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? searchActions.open() : searchActions.close())}>
      <DialogContent
        showCloseButton={false}
        className="top-[18vh] translate-y-0 gap-0 overflow-hidden rounded-[18px] p-0 shadow-float sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Search and commands</DialogTitle>
        <PaletteBody />
      </DialogContent>
    </Dialog>
  );
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

/** Mounted only while the dialog is open, so the search data is not watched otherwise. */
function PaletteBody() {
  const query = useStore($searchQuery);
  const { user } = useStore($auth);
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { resolvedTheme, setTheme } = useTheme();
  const { searchableItems } = useSearchData("home");
  const docs = useStore($documents);
  const kindOf = (id: string) => fileKind(docs.find((d) => d.id === id));

  const folderId = pathname.match(/^\/folder\/([^/?#]+)/)?.[1] ?? user?.id ?? "";

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
    { id: "templates", label: "Browse templates", icon: LayoutTemplate, run: () => go(templatesHref(folderId)) },
    { id: "vault", label: "Go to Vault", icon: FolderLock, run: () => go("/vault") },
    { id: "shared", label: "Go to Shared with me", icon: Users, run: () => go("/shared") },
    {
      id: "theme",
      label: resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme",
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
      run: () => go(r.type === "folder" ? `/folder/${r.id}` : templatesHref(folderId)),
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

  const visibleActions = q ? actions.filter((a) => a.label.toLowerCase().includes(q)) : actions;

  return (
    <Command shouldFilter={false} loop className="rounded-none">
      <CommandInput
        autoFocus
        value={query}
        onValueChange={searchActions.setQuery}
        placeholder="Search files, folders and templates"
        className="h-14 text-[15px]"
      />
      <CommandList className="max-h-[min(440px,60vh)] p-1.5">
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
    </Command>
  );
}

function PaletteItem({ entry }: { entry: Entry }) {
  return (
    // cmdk marks every item data-disabled="false"; the shared menu style dims on attribute presence.
    <CommandItem
      value={entry.id}
      onSelect={entry.run}
      className="h-9 data-[disabled=false]:!pointer-events-auto data-[disabled=false]:!opacity-100"
    >
      <entry.icon className={cn(entry.tint)} />
      <span className="truncate">{entry.label}</span>
      {entry.hint && (
        <span className="ml-auto pl-4 text-xs text-muted-foreground">{entry.hint}</span>
      )}
    </CommandItem>
  );
}
