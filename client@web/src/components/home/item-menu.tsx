import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ItemMenuProps {
  label: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Keep the trigger visible instead of revealing it on group hover. */
  alwaysVisible?: boolean;
}

/** "More actions" button for a file or folder; revealed when its `group` parent is hovered. */
export function ItemMenu({ label, children, open, onOpenChange, alwaysVisible }: ItemMenuProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            "shrink-0 text-muted-foreground transition-opacity data-[state=open]:opacity-100",
            !alwaysVisible && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
          onClick={(e) => e.stopPropagation()}
          aria-label={label}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
