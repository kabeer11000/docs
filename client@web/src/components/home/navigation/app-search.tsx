import { useStore } from "@nanostores/react";
import { File, FileText, Folder, Image, Plus, Search } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchData } from "@/hooks/use-search-data";
import { performSearch } from "@/lib/search";
import { cn } from "@/lib/utils";
import type { SearchResultType } from "@/state/search";
import {
  $currentPage,
  $searchOpen,
  $searchQuery,
  $searchResults,
  searchActions,
} from "@/state/search";

interface SearchModalProps {
  placeholder?: string;
  shortcut?: string[];
  children?: React.ReactNode;
  className?: string;
}

const getIconByType = (type: SearchResultType, iconName?: string) => {
  const iconMap = {
    file: File,
    folder: Folder,
    template: FileText,
    action: Plus,
    client: File,
  };

  if (iconName === "image") return Image;
  if (iconName === "file-text") return FileText;
  if (iconName === "file-plus") return FileText;
  if (iconName === "plus") return Plus;

  const IconComponent = iconMap[type] || File;
  return IconComponent;
};
export function AppSearch({
  placeholder = "Search documents, templates, clients...",
  shortcut = ["Ctrl", "K"],
  children,
  className,
}: SearchModalProps) {
  const open = useStore($searchOpen);
  const query = useStore($searchQuery);
  const results = useStore($searchResults);
  const currentPage = useStore($currentPage);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const optionRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  // Get user's searchable data
  const { searchableItems, isLoading: searchDataLoading } =
    useSearchData(currentPage);

  // Debounced search function with user data
  const performDebouncedSearch = useDebounce((searchQuery: string) => {
    searchActions.setIsSearching(true);
    const searchResults = performSearch(
      searchQuery,
      currentPage,
      searchableItems,
    );
    searchActions.setResults(searchResults);
    searchActions.setIsSearching(false);
    setSelectedIndex(0);
  }, 300);

  // Handle search input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    searchActions.setQuery(newQuery);

    // Use debounced search for non-empty queries
    if (newQuery.trim()) {
      performDebouncedSearch(newQuery);
    } else {
      // For empty queries, show initial results immediately
      const initialResults = performSearch("", currentPage, searchableItems);
      searchActions.setResults(initialResults);
      setSelectedIndex(0);
    }
  };

  // Handle keyboard shortcuts and navigation
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (open) {
          searchActions.close();
        } else {
          searchActions.open();
          // Load initial results when opening with user data
          const initialResults = performSearch(
            "",
            currentPage,
            searchableItems,
          );
          searchActions.setResults(initialResults);
        }
      }

      if (open) {
        if (e.key === "Escape") {
          e.preventDefault();
          searchActions.close();
        }

        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => {
            const newIndex = Math.min(prev + 1, results.length - 1);
            // Scroll option into view
            optionRefs.current[newIndex]?.scrollIntoView({ block: "nearest" });
            return newIndex;
          });
        }

        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => {
            const newIndex = Math.max(prev - 1, 0);
            // Scroll option into view
            optionRefs.current[newIndex]?.scrollIntoView({ block: "nearest" });
            return newIndex;
          });
        }

        if (e.key === "Enter") {
          e.preventDefault();
          if (results[selectedIndex]) {
            results[selectedIndex].onClick();
            // Don't close search for search-type actions on judgments page
            if (!results[selectedIndex].id.startsWith("search-")) {
              searchActions.close();
            }
          }
        }
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, results, selectedIndex, currentPage, searchableItems]);

  // Focus input when popover opens and load initial results
  React.useEffect(() => {
    if (open && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 10);

      return () => clearTimeout(timer);
    }
  }, [open]);

  // Reset selected index when results change
  React.useEffect(() => {
    setSelectedIndex(0);
    optionRefs.current = new Array(results.length).fill(null);
  }, [results]);

  return (
    <Popover
      open={open}
      onOpenChange={(newOpen) => {
        if (newOpen) {
          searchActions.open();
          const initialResults = performSearch(
            "",
            currentPage,
            searchableItems,
          );
          searchActions.setResults(initialResults);
        } else {
          searchActions.close();
        }
      }}
    >
      <PopoverTrigger asChild>
        {children || (
          <Button
            onKeyUp={(e) => e.preventDefault()}
            variant="secondary"
            tabIndex={-1}
            className={cn(
              "relative h-9 w-full justify-start gap-2 rounded-md border border-transparent bg-muted px-3 text-sm font-normal text-muted-foreground shadow-none transition-colors hover:bg-accent",
              open && "border-border bg-card hover:bg-card",
              className,
            )}
            type="button"
            onMouseDown={(e) => e.preventDefault()} // Prevents focus loss
          >
            <span
              className="flex items-center w-full gap-2 text-muted-foreground"
              tabIndex={-1}
            >
              <Search className="size-4" aria-hidden="true" />
              <Input
                ref={inputRef}
                value={query}
                onChange={handleInputChange}
                placeholder={placeholder}
                autoFocus={false}
                className="h-7 w-full border-0 bg-transparent px-0 shadow-none hover:border-0 focus-visible:ring-0 dark:bg-transparent"
                tabIndex={-1}
                aria-label="Search documents, folders, and templates"
                aria-expanded={open}
                aria-haspopup="listbox"
                role="combobox"
                aria-autocomplete="list"
                aria-activedescendant={
                  results.length > 0
                    ? `search-option-${selectedIndex}`
                    : undefined
                }
              />
            </span>
            <kbd
              className={cn(
                "pointer-events-none ml-auto hidden h-5 select-none items-center gap-0.5 rounded border border-border bg-card px-1.5 font-sans text-[11px] font-medium text-muted-foreground transition-opacity sm:flex",
                open ? "opacity-0" : "opacity-100",
              )}
            >
              {shortcut.map((key, index) => (
                <React.Fragment key={key}>
                  {index > 0 && " "}
                  <span>{key}</span>
                </React.Fragment>
              ))}
            </kbd>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={6}
        className="w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-lg p-0"
        // hideCloseButton
      >
        {/*  Search Results */}
        <div
          className="max-h-96 overflow-y-auto p-1"
          role="listbox"
          aria-label="Search results"
        >
          {results.length > 0 ? (
            results.map((item, index) => {
              const IconComponent = getIconByType(item.type, item.icon);
              const isSelected = selectedIndex === index;

              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    optionRefs.current[index] = el;
                  }}
                  id={`search-option-${index}`}
                  onClick={() => {
                    item.onClick();
                    // Don't close search for search-type actions on judgments page
                    if (!item.id.startsWith("search-")) {
                      searchActions.close();
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent hover:text-accent-foreground",
                  )}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={`${item.title} - ${item.type}${item.description ? ` - ${item.description}` : ""}`}
                  tabIndex={-1}
                >
                  <span
                    className={cn(
                      "flex-shrink-0",
                      isSelected
                        ? "text-accent-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    <IconComponent className="size-4" aria-hidden="true" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.title}</div>
                    {item.subtitle && (
                      <div className="text-xs text-muted-foreground truncate">
                        {item.subtitle}
                      </div>
                    )}
                    {item.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </div>
                    )}
                  </div>
                  {item.type && (
                    <span className="text-xs text-muted-foreground capitalize">
                      {item.type}
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {query
                ? "No results found."
                : "Type to search documents, folders, templates..."}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
