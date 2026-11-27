import { PaperSheet } from "@/components/home/paper-sheet";
import { cn } from "@/lib/utils";
import { displayValue, isWorkbookSnapshot, snapshotToGrid } from "@/lib/sheet/grid";

const COLS = 8;
const ROWS = 24;

/** Home thumbnail: the top-left cells of the first sheet as a tiny flat grid. */
export function SheetThumbnail({ data }: { data: unknown }) {
  const grid = isWorkbookSnapshot(data) ? snapshotToGrid(data, undefined, ROWS, COLS) : [];
  return (
    <PaperSheet>
      <div
        className="pointer-events-none absolute inset-0 grid select-none text-[2.1cqw] leading-none tabular-nums"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gridAutoRows: `${100 / ROWS}%` }}
        aria-hidden="true"
      >
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const r = Math.floor(i / COLS);
          const c = i % COLS;
          const v = grid[r]?.[c]?.v ?? null;
          return (
            <div
              key={i}
              className={cn(
                "flex items-center overflow-hidden whitespace-nowrap border-r border-b border-paper-foreground/[0.08] px-[0.8cqw]",
                typeof v === "number" && "justify-end",
                r === 0 && "font-medium",
              )}
            >
              {displayValue(v)}
            </div>
          );
        })}
      </div>
    </PaperSheet>
  );
}
