import { FileText, type LucideIcon, Presentation, Sheet } from "lucide-react";
import type { FileKind } from "@/lib/files";
import { cn } from "@/lib/utils";

/** Per-app identity used across Home, the sidebar and the palette. Literal classes so Tailwind sees them. */
export const KIND: Record<
  FileKind,
  {
    icon: LucideIcon;
    label: string;
    plural: string;
    blank: string;
    text: string;
    bg: string;
    soft: string;
  }
> = {
  doc: {
    icon: FileText,
    label: "Document",
    plural: "Documents",
    blank: "Blank page",
    text: "text-doc",
    bg: "bg-doc",
    soft: "bg-doc-soft",
  },
  sheet: {
    icon: Sheet,
    label: "Spreadsheet",
    plural: "Spreadsheets",
    blank: "Empty grid",
    text: "text-sheet",
    bg: "bg-sheet",
    soft: "bg-sheet-soft",
  },
  slides: {
    icon: Presentation,
    label: "Presentation",
    plural: "Presentations",
    blank: "First slide",
    text: "text-slides",
    bg: "bg-slides",
    soft: "bg-slides-soft",
  },
};

export const KINDS: FileKind[] = ["doc", "sheet", "slides"];

/** Small rounded chip with the app glyph in its colour. */
export function KindIcon({
  kind,
  className,
}: {
  kind: FileKind;
  className?: string;
}) {
  const { icon: Icon, soft, text } = KIND[kind];
  return (
    <span
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-[7px]",
        soft,
        text,
        className,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
    </span>
  );
}

export type KindFilterValue = FileKind | "all";

/** Chips that narrow a file list to one app. */
export function KindFilter({
  value,
  onChange,
}: {
  value: KindFilterValue;
  onChange: (v: KindFilterValue) => void;
}) {
  const options: { value: KindFilterValue; label: string; dot?: string }[] = [
    { value: "all", label: "All" },
    ...KINDS.map((k) => ({ value: k, label: KIND[k].plural, dot: KIND[k].bg })),
  ];
  return (
    <fieldset className="flex flex-wrap items-center gap-1.5">
      <legend className="sr-only">File type</legend>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "press inline-flex h-8 items-center gap-2 rounded-full px-3 text-[13px] font-medium transition-colors",
              on
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground shadow-card hover:text-foreground",
            )}
          >
            {o.dot && (
              <span
                className={cn("size-2 rounded-full", o.dot)}
                aria-hidden="true"
              />
            )}
            {o.label}
          </button>
        );
      })}
    </fieldset>
  );
}
