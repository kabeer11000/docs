import { Folder } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FolderTabProps extends Omit<React.ComponentProps<"div">, "children"> {
  name: string;
  fileCount?: number;
  onOpen: () => void;
  /** Trailing menu trigger, shown on hover. */
  actions?: ReactNode;
  disabled?: boolean;
}

/** Compact folder card: icon chip, name, file count. */
export function FolderTab({
  name,
  fileCount = 0,
  onOpen,
  actions,
  disabled,
  className,
  ...props
}: FolderTabProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: contains a nested menu button
    <div
      role="link"
      tabIndex={0}
      aria-label={`Open folder ${name}`}
      className={cn(
        "group lift flex h-12 min-w-0 cursor-pointer items-center gap-2.5 rounded-[12px] bg-card pr-1.5 pl-2 text-sm shadow-card outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      {...props}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-muted text-foreground/70" aria-hidden="true">
        <Folder className="size-4 fill-current/15" />
      </span>
      <span className="min-w-0 flex-1 truncate font-display font-semibold tracking-[-0.01em] text-foreground">{name}</span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{fileCount}</span>
      {actions ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: stops row navigation from menu clicks
        <div className="shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          {actions}
        </div>
      ) : (
        <span className="w-1" />
      )}
    </div>
  );
}
