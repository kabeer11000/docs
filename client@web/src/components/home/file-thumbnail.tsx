import type { FileKind } from "@/lib/files";
import { cn } from "@/lib/utils";
import { SheetThumbnail } from "@/components/sheet/sheet-thumbnail";
import { SlidesThumbnail } from "@/components/slides/slides-thumbnail";
import { PaperSheet } from "./paper-sheet";

/** Home card preview for any file kind. */
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
  if (kind === "doc") return <PaperSheet title={title} content={content} className={className} />;
  return (
    <div className={cn("rounded-[2px]", className)}>
      {kind === "sheet" ? <SheetThumbnail data={data} /> : <SlidesThumbnail data={data} />}
    </div>
  );
}
