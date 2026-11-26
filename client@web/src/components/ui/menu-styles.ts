// One look for every menu-like surface (dropdown, context menu, select, command).
// A small paper sheet: hairline edge, tight padding, 32px rows, quiet icons.

const enter =
  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-100 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1";

export const menuSurface = `z-50 min-w-[13rem] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-float ${enter}`;

export const menuItem =
  "relative flex h-8 w-full cursor-default select-none items-center gap-2.5 rounded-[5px] px-2 text-[13px] leading-none text-foreground outline-none transition-colors duration-75 focus:bg-accent data-[highlighted]:bg-accent data-[state=open]:bg-accent data-[selected=true]:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[15px] [&_svg:not([class*='text-'])]:text-muted-foreground";

export const menuItemDestructive =
  "data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:data-[highlighted]:bg-destructive/10 data-[variant=destructive]:[&_svg]:!text-destructive";

/** Leaves room on the left for a check / radio indicator. */
export const menuItemInset = "pl-7";

export const menuIndicator = "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center text-primary";

export const menuLabel = "px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground";

export const menuSeparator = "-mx-1 my-1 h-px bg-border";

export const menuShortcut = "ml-auto pl-4 text-xs tabular-nums text-muted-foreground";
