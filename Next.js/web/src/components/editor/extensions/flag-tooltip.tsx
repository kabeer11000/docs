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
        <div className={`p-4 ${type === "red" ? "bg-red-50" : "bg-green-50"}`}>
          <div className="flex items-start gap-2">
            {type === "red" ? (
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4
                  className={`font-semibold text-sm ${type === "red" ? "text-red-900" : "text-green-900"}`}
                >
                  {type === "red" ? "Red Flag" : "Green Flag"}
                </h4>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    severity === "high"
                      ? "bg-red-200 text-red-800"
                      : severity === "medium"
                        ? "bg-yellow-200 text-yellow-800"
                        : "bg-blue-200 text-blue-800"
                  }`}
                >
                  {severity}
                </span>
              </div>
              <p
                className={`text-sm mb-2 ${type === "red" ? "text-red-800" : "text-green-800"}`}
              >
                {reason}
              </p>
              {recommendation && type === "red" && (
                <div className="mt-2 pt-2 border-t border-red-200">
                  <p className="text-xs font-medium text-red-900 mb-1">
                    💡 Recommendation:
                  </p>
                  <p className="text-xs text-red-700">{recommendation}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>,
    document.body,
  );
};
