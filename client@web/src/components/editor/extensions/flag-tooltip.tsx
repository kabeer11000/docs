import { AlertTriangle, CheckCircle } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface FlagTooltipProps {
  element: HTMLElement;
  type: "red" | "green";
  reason: string;
  severity: string;
  recommendation?: string;
}

export const FlagTooltip: React.FC<FlagTooltipProps> = ({
  element,
  type,
  reason,
  severity,
  recommendation,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClick = () => setIsOpen(true);
    element.addEventListener("click", handleClick);

    return () => {
      element.removeEventListener("click", handleClick);
    };
  }, [element]);

  return createPortal(
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <span style={{ display: "none" }} />
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        style={{
          position: "fixed",
          left: `${element.getBoundingClientRect().left}px`,
          top: `${element.getBoundingClientRect().bottom + 5}px`,
        }}
      >
        <div className="flex items-start gap-2.5 p-3">
          {type === "red" ? (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
          ) : (
            <CheckCircle className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" />
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h4 className="text-[13px] font-medium">
                {type === "red" ? "Red flag" : "Green flag"}
              </h4>
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium capitalize ${
                  severity === "high"
                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                    : severity === "medium"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {severity}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{reason}</p>
            {recommendation && type === "red" && (
              <div className="mt-2 border-t border-border pt-2">
                <p className="mb-0.5 text-xs font-medium">Recommendation</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{recommendation}</p>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>,
    document.body,
  );
};
