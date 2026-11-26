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

/** A quiet folder row used on the desk: icon, name, count. */
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
        "group flex h-10 min-w-0 cursor-pointer items-center gap-2.5 rounded-md border border-border pr-1 pl-3 text-sm transition-colors outline-none hover:border-foreground/20 hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring",
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
      <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{name}</span>
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
