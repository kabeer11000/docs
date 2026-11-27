import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: ReactNode;
  /** Renders a collapse toggle; must be inside a Collapsible. */
  collapsible?: boolean;
  open?: boolean;
  actions?: ReactNode;
}

export function SectionHeader({
  title,
  collapsible,
  open = true,
  actions,
}: SectionHeaderProps) {
  return (
    <div className="mb-3 flex min-h-8 flex-wrap items-center gap-x-1 gap-y-2">
      <h2 className="font-display text-lg font-semibold tracking-[-0.015em] text-foreground">{title}</h2>
      {collapsible && (
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label={open ? "Collapse section" : "Expand section"}
          >
            <ChevronDown
              className={cn(
                "transition-transform duration-150",
                !open && "-rotate-90",
              )}
            />
          </Button>
        </CollapsibleTrigger>
      )}
      {actions && <div className="ml-auto flex items-center">{actions}</div>}
    </div>
  );
}
