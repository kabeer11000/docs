import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

export interface VisuallyHiddenProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  asChild?: boolean;
}

const VisuallyHidden = React.forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  ({ asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "span";
    return <Comp ref={ref} className="sr-only" {...props} />;
  },
);

VisuallyHidden.displayName = "VisuallyHidden";

export { VisuallyHidden };
