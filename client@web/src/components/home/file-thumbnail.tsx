import { SheetThumbnail } from "@/components/sheet/sheet-thumbnail";
import { SlidesThumbnail } from "@/components/slides/slides-thumbnail";
import type { FileKind } from "@/lib/files";
import { cn } from "@/lib/utils";
import { KIND } from "./kind";
import { PaperSheet } from "./paper-sheet";

/**
 * Card preview for any file kind: a well tinted in the app's colour with the file inside it.
 * Pages peek up from the bottom; slides sit centred.
 */
export function FileThumbnail({
  kind,
  title,
  content,
  data,
  className,
}: {
  kind: FileKind;
  title: string;
  content?: unknown;
  data?: unknown;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[4/3] w-full overflow-hidden",
        KIND[kind].soft,
        className,
      )}
    >
      {kind === "slides" ? (
        <div className="absolute inset-x-[10%] top-1/2 -translate-y-1/2 transition-transform duration-200 group-hover:scale-[1.02]">
          <SlidesThumbnail data={data} />
        </div>
      ) : (
        <div className="absolute inset-x-[14%] top-[12%] transition-transform duration-200 group-hover:-translate-y-1">
          {kind === "sheet" ? (
            <SheetThumbnail data={data} />
          ) : (
            <PaperSheet title={title} content={content} />
          )}
        </div>
      )}
    </div>
  );
}
