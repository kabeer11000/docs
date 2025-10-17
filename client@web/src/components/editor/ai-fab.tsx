import { useStore } from "@nanostores/react";
import { editorActions, editorUIState } from "@repo/shadcn-ui/state/editor";
import { Sparkles, X } from "lucide-react";
import { computed } from "nanostores";
import { cn } from "@/lib/utils";

interface AIFabProps {
  isOpen?: boolean;
  onClick?: () => void;
  hasUnreadMessages?: boolean;
  className?: string;
}

export function AIFab({ hasUnreadMessages = false, className }: AIFabProps) {
  const isOpen = useStore(
    computed(editorUIState, (state) => state.isAIPanelOpen),
  );

  return (
    <div
      onClick={() => editorActions.setAIPanelOpen(true)}
      className={cn(
        "fixed bottom-6 right-6 h-14 w-14 cursor-pointer z-10 group",
        "transition-all duration-300 ease-in-out",
        isOpen && "opacity-0 scale-75 pointer-events-none",
        className,
      )}
    >
      <div
        className={cn(
          "relative h-full w-full overflow-hidden",
          "rounded-xl transition-all duration-300 ease-in-out",
          "shadow-lg hover:shadow-xl",
          "group-hover:rounded-full group-hover:scale-110",
          "flex items-center justify-center",
        )}
      >
        <img
          src="/assets/ai-button-bg.png"
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            "transition-transform duration-300 ease-in-out",
            "group-hover:scale-105",
          )}
          loading="lazy"
          alt="AI Background"
        />

        <div className="relative z-10 flex items-center justify-center">
          {isOpen ? (
            <X
              className={cn(
                "h-6 w-6 text-white",
                "transition-all duration-300 ease-in-out",
                "group-hover:scale-110 group-hover:rotate-90",
              )}
            />
          ) : (
            <>
              <Sparkles
                className={cn(
                  "h-6 w-6 text-white",
                  "transition-all duration-300 ease-in-out",
                  "group-hover:scale-110 group-hover:rotate-12",
                )}
              />
              {hasUnreadMessages && (
                <div
                  className={cn(
                    "absolute -top-1 -right-1 w-3 h-3",
                    "bg-red-500 rounded-full border-2 border-white",
                    "animate-pulse transition-all duration-300",
                  )}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
