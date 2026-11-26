"use client";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Borderless-until-hover select trigger used across the editor toolbar. */
export const toolbarSelectClass =
  "h-8 min-h-8 border-transparent bg-transparent shadow-none px-2 text-[13px] hover:bg-accent hover:border-transparent data-[state=open]:bg-accent";

interface ToolbarButtonProps extends React.ComponentProps<typeof Button> {
  label: string;
  active?: boolean;
}

export function ToolbarButton({
  label,
  active = false,
  className,
  children,
  ...props
}: ToolbarButtonProps) {
  return (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-pressed={active || undefined}
          className={cn(
            "text-muted-foreground",
            active && "bg-accent text-foreground",
            className,
          )}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function ToolbarSeparator({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("mx-1 h-5 w-px shrink-0 bg-border", className)}
    />
  );
}
