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
        <figure className="absolute top-0 left-1/2 w-full h-full -translate-x-1/2 rounded-full bg-teal-500/30 dark:bg-teal-500/20 blur-[120px]" />
      </div>

      {/* Accent blur for depth */}
      <figure className="pointer-events-none absolute left-[5%] top-[20%] z-10 aspect-square w-[200px] rounded-full bg-cyan-400/40 dark:bg-cyan-400/25 blur-[100px]" />
      <figure className="pointer-events-none absolute right-[5%] bottom-[20%] z-10 aspect-square w-[180px] rounded-full bg-teal-400/35 dark:bg-teal-400/20 blur-[80px]" />

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
            text="Welcome to Kabeer Docs"
            gradient="linear-gradient(90deg, #064e3b 0%, #0c4a6e 30%, #0891b2 50%, #0c4a6e 70%, #064e3b 100%)"
          />
        </h2>
        <p className="text-foreground dark:text-foreground text-xs sm:text-sm max-w-lg leading-relaxed">
          Kabeer Docs provides comprehensive legal document management with 24/7 AI support for legal professionals
          and students. Get started now!
        </p>
      </div>
    </div>
  );
}
