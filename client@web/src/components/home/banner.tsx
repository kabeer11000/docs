import { XIcon } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { GradientText } from "@/components/ui/shadcn-io/gradient-text";

export function Banner() {
  const ref = useRef<HTMLDivElement | null>(null);

  const handleClose = () => {
    let expires = "";
    const days = 15;
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = `; expires=${date.toUTCString()}`;
    document.cookie = `lx.popups.0152.cl=${1 || ""}${expires}; path=/`;
    ref?.current?.classList?.add("hidden");
  };

  return (
    <div
      ref={ref}
      className="relative w-full h-auto rounded-lg bg-card dark:bg-card overflow-hidden border border-border min-h-[120px] sm:min-h-[140px] md:min-h-[160px]"
    >
      {/* Ethereal background blur effects */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <figure className="absolute top-0 left-1/2 w-full h-full -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      </div>

      {/* Accent blur for depth */}
      <figure className="pointer-events-none absolute left-[5%] top-[20%] z-10 aspect-square w-[200px] rounded-full bg-secondary/30 blur-[100px]" />
      <figure className="pointer-events-none absolute right-[5%] bottom-[20%] z-10 aspect-square w-[180px] rounded-full bg-accent/25 blur-[80px]" />

      <div className="absolute z-20 top-2 right-2">
        <Button
          onClick={handleClose}
          variant="ghost"
          className="rounded-full cursor-pointer min-h-[44px] min-w-[44px] text-foreground hover:text-foreground hover:bg-accent"
          size="icon"
          aria-label="Close welcome banner"
        >
          <XIcon className="h-5 w-5" />
        </Button>
      </div>
      <div className="absolute z-20 p-4 sm:p-6 md:p-8 rounded-lg top-0 left-0">
        <h2 className="text-2xl sm:text-3xl md:text-4xl mb-3 sm:mb-4 font-medium">
          <GradientText
            text="Welcome to Kabeer's Docs"
            gradient="linear-gradient(90deg, hsl(220, 98%, 61%) 0%, hsl(260, 80%, 56%) 50%, hsl(40, 100%, 50%) 100%)"
          />
        </h2>
        <p className="text-foreground dark:text-foreground text-xs sm:text-sm max-w-lg leading-relaxed">
          Kabeer's Docs provides comprehensive document management with 24/7 AI support for teams and individuals.
          Get started now!
        </p>
      </div>
    </div>
  );
}
