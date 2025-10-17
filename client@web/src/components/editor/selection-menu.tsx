import {
  Brain,
  LibraryBig,
  MessagesSquare,
  Sparkles,
  Telescope,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SelectionMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onComment: () => void;
  onExplain?: () => void;
  onAskLexa: () => void;
  onSummarize?: () => void;
  onAnalyze?: () => void;
}

export const SelectionMenu: React.FC<SelectionMenuProps> = ({
  isVisible,
  position,
  onComment,
  onExplain,
  onAskLexa,
  onSummarize,
  onAnalyze,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (!menuRef.current || !isVisible) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position
    if (x + rect.width > viewport.width - 20) {
      x = viewport.width - rect.width - 20;
    }
    if (x < 20) {
      x = 20;
    }

    // Adjust vertical position (show above if too close to bottom)
    if (y + rect.height > viewport.height - 60) {
      y = position.y - rect.height - 20;
    }
    if (y < 20) {
      y = 20;
    }

    setAdjustedPosition({ x, y });
  }, [position, isVisible]);

  if (!isVisible) return null;

  type ActionType = {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick: () => void;
  };

  const actions = [
    {
      icon: Sparkles,
      label: "AI Assistant",
      onClick: onAskLexa,
    },
    onSummarize && {
      icon: LibraryBig,
      label: "Summarize",
      onClick: onSummarize,
    },
    onExplain && {
      icon: Brain,
      label: "Explain",
      onClick: onExplain,
    },
    onAnalyze && {
      icon: Telescope,
      label: "Analyze",
      onClick: onAnalyze,
    },
    {
      icon: MessagesSquare,
      label: "Comment",
      onClick: onComment,
    },
  ].filter(Boolean) as ActionType[];

  return (
    <div
      ref={menuRef}
      data-selection-menu
      className={cn(
        "fixed z-50 bg-background border border-border rounded-lg shadow-lg",
        "animate-in fade-in zoom-in-95 duration-150",
      )}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1 p-1">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            size="sm"
            onClick={action.onClick}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all",
              "text-muted-foreground hover:bg-muted hover:text-primary",
            )}
          >
            <action.icon className="w-4 h-4" />
            <span>{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
