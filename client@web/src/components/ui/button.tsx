import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium select-none transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/40 focus-visible:ring-[3px] aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(0_0_0/0.12)] hover:bg-primary/88",
        app: "bg-app text-app-foreground shadow-[0_1px_2px_rgb(0_0_0/0.12)] hover:bg-app/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/40",
        outline: "border border-border bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.04)] hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost:
          "text-foreground/80 hover:text-foreground hover:bg-accent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 text-[13px] has-[>svg]:px-2.5",
        lg: "h-10 px-5 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
