import type * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input h-12 w-full min-w-0 rounded-2xl border bg-white/[0.04] px-4 py-2 text-base shadow-[inset_0_1px_0_oklch(1_0_0/0.04)] transition-[background-color,border-color,box-shadow] duration-300 ease-soft outline-none hover:bg-white/[0.06] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm min-h-12",
        "focus-visible:border-white/25 focus-visible:bg-white/[0.06] focus-visible:ring-white/[0.08] focus-visible:ring-4",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
