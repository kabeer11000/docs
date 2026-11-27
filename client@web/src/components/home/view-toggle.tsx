import { LayoutGrid, List } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ViewMode = "grid" | "list";

/**
 * State remembered in localStorage under `docs.<key>` (no key: plain state). Read after mount so the server
 * render and the first client render agree.
 */
export function usePref<T>(key: string | false | undefined | "", initial: T) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    if (!key) return;
    try {
      const raw = localStorage.getItem(`docs.${key}`);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* unreadable pref: keep the default */
    }
  }, [key]);

  const update = (next: T) => {
    setValue(next);
    if (key) localStorage.setItem(`docs.${key}`, JSON.stringify(next));
  };

  return [value, update] as const;
}

/** Grid or list, remembered per section (home, vault, folder, starred, shared). */
export function useViewMode(section = "default") {
  return usePref<ViewMode>(`view.${section}`, "grid");
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
    <div
      role="radiogroup"
      aria-label="View"
      className="flex items-center gap-0.5 rounded-[10px] bg-muted p-0.5"
    >
      {options.map((o) => (
        // biome-ignore lint/a11y/useSemanticElements: segmented control; native radios cannot be styled as these buttons
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
