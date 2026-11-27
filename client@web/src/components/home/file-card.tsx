import type { ReactNode } from "react";
import type { FileKind } from "@/lib/files";
import { cn } from "@/lib/utils";
import { FileThumbnail } from "./file-thumbnail";
import { KindIcon } from "./kind";

interface FileCardProps {
  kind: FileKind;
  title: string;
  /** Second line, e.g. "Edited 2 hours ago". */
  detail: ReactNode;
  content?: unknown;
  data?: unknown;
  /** Trailing menu trigger; clicks inside never open the card. */
  actions?: ReactNode;
  large?: boolean;
  dimmed?: boolean;
}

/** Home file card: tinted preview well, app chip, display-type title. Wrap it in a link or role="link" element. */
export function FileCard({
  kind,
  title,
  detail,
  content,
  data,
  actions,
  large,
  dimmed,
}: FileCardProps) {
  return (
    <div
      className={cn(
        "lift flex h-full min-w-0 flex-col overflow-hidden rounded-[14px] bg-card shadow-card",
        "group-focus-visible:ring-[3px] group-focus-visible:ring-ring",
        dimmed && "opacity-50",
      )}
    >
      <FileThumbnail kind={kind} title={title} content={content} data={data} />
      <div
        className={cn(
          "flex items-center gap-2.5 py-3 pr-1.5 pl-3",
          large && "py-3.5 pl-3.5",
        )}
      >
        <KindIcon kind={kind} />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate font-display font-semibold tracking-[-0.01em] text-foreground",
              large ? "text-[15px]" : "text-sm",
            )}
          >
            {title || "Untitled"}
          </p>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
        {actions && (
          // biome-ignore lint/a11y/noStaticElementInteractions: stops card navigation from menu clicks
          <div
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
