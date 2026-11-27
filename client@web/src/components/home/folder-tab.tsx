import { Folder } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FolderTabProps
  extends Omit<React.ComponentProps<"div">, "children" | "title"> {
  /** Plain name, for the accessible label. */
  label: string;
  /** What shows as the name (e.g. an inline-rename field); defaults to the label. */
  title?: ReactNode;
  fileCount?: number;
  /** Trailing menu trigger, shown on hover. */
  actions?: ReactNode;
  disabled?: boolean;
}

/** Compact folder card: icon chip, name, file count. Behaviour (select, open, drop) comes in through props. */
export function FolderTab({
  label,
  title,
  fileCount = 0,
  actions,
  disabled,
  className,
  ...props
}: FolderTabProps) {
  return (
    <div
      role="option"
      tabIndex={0}
      aria-selected={false}
      aria-label={`Folder ${label}`}
      className={cn(
        "group lift flex h-12 min-w-0 cursor-default items-center gap-2 rounded-[14px] bg-card pr-1 pl-2 text-sm shadow-card outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      {...props}
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-muted text-foreground/70"
        aria-hidden="true"
      >
        <Folder className="size-4 fill-current/15" />
      </span>
      <span className="min-w-0 flex-1 font-display font-semibold tracking-[-0.01em] text-foreground">
        {title ?? label}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {fileCount}
      </span>
      {actions ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: keeps menu clicks from selecting or opening the folder
        <div
          className="shrink-0"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      ) : (
        <span className="w-1" />
      )}
    </div>
  );
}
