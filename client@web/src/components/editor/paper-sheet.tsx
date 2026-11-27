import type { CSSProperties, ReactNode } from "react";
import type { PageGeometry } from "@/lib/paper";

/** Stack of real-size pages; the editor (or the loading placeholder) flows over them. */
export function PaperSheet({ geometry: g, pages, children }: { geometry: PageGeometry; pages: number; children: ReactNode }) {
  const style = {
    "--page-w": `${g.width}px`,
    "--page-h": `${g.height}px`,
    "--m-top": `${g.margins.top}px`,
    "--m-right": `${g.margins.right}px`,
    "--m-bottom": `${g.margins.bottom}px`,
    "--m-left": `${g.margins.left}px`,
    "--sheet-h": `${pages * g.height + (pages - 1) * g.gap}px`,
  } as CSSProperties;
  return (
    <div className="paper-sheet" style={style}>
      {Array.from({ length: pages }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: pages are positional
          key={i}
          aria-hidden
          className="pointer-events-none absolute left-0 w-full rounded-[4px] bg-paper shadow-card"
          style={{ top: i * (g.height + g.gap), height: g.height }}
        />
      ))}
      {children}
    </div>
  );
}
