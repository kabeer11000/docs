import { LayoutGrid, List } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ViewMode = "grid" | "list";

const KEY = "docs.view";

/** Grid or list for file pages, remembered across pages and visits. */
export function useViewMode() {
  const [view, setView] = useState<ViewMode>("grid");

  useEffect(() => {
    if (localStorage.getItem(KEY) === "list") setView("list");
  }, []);

  const update = (next: ViewMode) => {
    setView(next);
    localStorage.setItem(KEY, next);
  };

  return [view, update] as const;
}

const options = [
  { value: "grid", label: "Grid view", icon: LayoutGrid },
  { value: "list", label: "List view", icon: List },
] as const;

export function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}) {
  return (
    <div role="radiogroup" aria-label="View" className="flex items-center gap-0.5 rounded-[10px] bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={view === o.value}
          aria-label={o.label}
          title={o.label}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex size-7 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:text-foreground",
            view === o.value && "bg-card text-foreground shadow-card",
          )}
        >
          <o.icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
