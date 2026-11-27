import { useStore } from "@nanostores/react";
import {
  Compass,
  FileText,
  Folder,
  FolderLock,
  LayoutTemplate,
  type LucideIcon,
  Plus,
  Presentation,
  Sheet,
  SunMoon,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { useCreateFile } from "@/hooks/use-create-file";
import { hrefForId } from "@/lib/files";
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
        className="top-[20vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
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

  const folderId = pathname.match(/^\/folder\/([^/?#]+)/)?.[1] ?? user?.id ?? "";

  const { create } = useCreateFile();
  const make = (kind: "doc" | "sheet" | "slides") => {
    searchActions.close();
    create(kind, folderId);
  };

  const go = (path: string) => {
    searchActions.close();
    router.push(path);
  };

  const actions: Entry[] = [
    { id: "new", label: "New document", icon: Plus, run: () => make("doc") },
    { id: "new-sheet", label: "New spreadsheet", icon: Sheet, run: () => make("sheet") },
    { id: "new-slides", label: "New presentation", icon: Presentation, run: () => make("slides") },
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

  const toEntry = (r: { id: string; title: string; type: string }): Entry => ({
      id: `${r.type}:${r.id}`,
      label: r.title,
      hint: r.type === "file" ? "Document" : r.type === "folder" ? "Folder" : "Template",
      icon: typeIcon[r.type] ?? FileText,
      run: () =>
        go(
          r.type === "folder"
            ? `/folder/${r.id}`
            : r.type === "template"
              ? templatesHref(folderId)
              : hrefForId(r.id),
        ),
    });
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
        placeholder="Search documents, folders, templates"
        className="h-12"
      />
      <CommandList className="max-h-[min(420px,60vh)] p-1">
        <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
          No matches for "{query}".
        </CommandEmpty>
        {results.length > 0 && (
          <CommandGroup heading={q ? "Results" : "Recent documents"}>
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
      className="data-[disabled=false]:!pointer-events-auto data-[disabled=false]:!opacity-100"
    >
      <entry.icon />
      <span className="truncate">{entry.label}</span>
      {entry.hint && (
        <span className="ml-auto pl-4 text-xs text-muted-foreground">{entry.hint}</span>
      )}
    </CommandItem>
  );
}
