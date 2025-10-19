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
        "fixed bottom-[56px] right-6 h-12 w-12 cursor-pointer z-[3] group",
        "transition-all duration-300 ease-in-out shadow-sm",
        isOpen && "opacity-0 scale-75 pointer-events-none",
        className,
      )}
    >
      <div
        className={cn(
          "relative h-full w-full overflow-hidden",
          "rounded-full transition-all duration-300 ease-in-out",
          "bg-primary group-hover:bg-primary/90 hover:shadow-md",
          "flex items-center justify-center border border-primary/20",
        )}
      >
        <div className="relative z-10 flex items-center justify-center">
          <Sparkles
            className={cn(
              "h-5 w-5 text-primary-foreground",
              "transition-all duration-300 ease-in-out",
              "group-hover:scale-110 group-hover:rotate-12",
            )}
          />
          {hasUnreadMessages && (
            <div
              className={cn(
                "absolute -top-1 -right-1 w-3 h-3",
                "bg-destructive rounded-full border border-background",
                "animate-pulse transition-all duration-300",
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}
