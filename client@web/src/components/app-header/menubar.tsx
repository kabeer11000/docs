"use client";

import { MoreHorizontal } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { type AppMenu, formatShortcut, isSub, type MenuEntry } from "./menus";

const isMac = () =>
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Runs the action after the menu has closed and its focus has settled, so actions that focus the
 * editor (or open a prompt or dialog) keep that focus.
 */
function useRunner() {
  const ran = useRef(false);
  return {
    run: (fn: () => void) => {
      ran.current = true;
      requestAnimationFrame(fn);
    },
    /** Pass to the menu content: keyboard focus goes back to the trigger only when nothing ran. */
    onCloseAutoFocus: (e: Event) => {
      if (ran.current) e.preventDefault();
      ran.current = false;
    },
  };
}

/** Builds the items when the menu opens, so enabled and checked states are read fresh. */
function LiveEntries({
  build,
  run,
}: {
  build: () => MenuEntry[];
  run: (fn: () => void) => void;
}) {
  return <Entries items={build()} run={run} />;
}

function Entries({
  items,
  run,
}: {
  items: MenuEntry[];
  run: (fn: () => void) => void;
}): ReactNode {
  const mac = isMac();
  return items.map((item, i) => {
    if (item === "separator")
      return (
        <DropdownMenuSeparator
          // Menus are tidied, so a separator always follows an item: key it by that item.
          key={`sep-${(items[i - 1] as Exclude<MenuEntry, "separator">)?.id}`}
        />
      );
    if (isSub(item)) {
      return (
        <DropdownMenuSub key={item.id}>
          <DropdownMenuSubTrigger disabled={item.disabled}>
            {item.label}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-48">
            <Entries items={item.items} run={run} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    }
    const trailing = item.shortcut ? (
      <DropdownMenuShortcut>
        {formatShortcut(item.shortcut, mac)}
      </DropdownMenuShortcut>
    ) : item.hint ? (
      <DropdownMenuShortcut>{item.hint}</DropdownMenuShortcut>
    ) : null;
    if (item.checked !== undefined) {
      return (
        <DropdownMenuCheckboxItem
          key={item.id}
          checked={item.checked}
          disabled={item.disabled}
          onSelect={() => run(item.run)}
          data-menu-id={item.id}
        >
          {item.label}
          {trailing}
        </DropdownMenuCheckboxItem>
      );
    }
    return (
      <DropdownMenuItem
        key={item.id}
        disabled={item.disabled}
        variant={item.destructive ? "destructive" : "default"}
        onSelect={() => run(item.run)}
        data-menu-id={item.id}
      >
        {item.label}
        {trailing}
      </DropdownMenuItem>
    );
  });
}

/**
 * A Mac-style menu bar: once one menu is open, hovering another switches to it, and Left/Right
 * move between menus. Built on the dropdown primitive (non-modal so the bar stays hoverable).
 */
export function Menubar({
  build,
  className,
}: {
  build: () => AppMenu[];
  className?: string;
}) {
  const menus = build();
  const [open, setOpen] = useState<string | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const runner = useRunner();

  const step = (from: string, dir: 1 | -1) => {
    const i = menus.findIndex((m) => m.id === from);
    const next = menus[(i + dir + menus.length) % menus.length];
    setOpen(next.id);
    bar.current
      ?.querySelector<HTMLElement>(`[data-menubar-trigger="${next.id}"]`)
      ?.focus();
  };

  const onContentKey = (id: string) => (e: KeyboardEvent) => {
    // Submenus handle (and prevent) their own arrows first.
    if (e.defaultPrevented) return;
    if (e.key === "ArrowRight") step(id, 1);
    else if (e.key === "ArrowLeft") step(id, -1);
  };

  const onTriggerKey = (id: string) => (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = menus.findIndex((m) => m.id === id);
    const next =
      menus[
        (i + (e.key === "ArrowRight" ? 1 : -1) + menus.length) % menus.length
      ];
    bar.current
      ?.querySelector<HTMLElement>(`[data-menubar-trigger="${next.id}"]`)
      ?.focus();
  };

  return (
    <div
      ref={bar}
      role="menubar"
      aria-label="Menu bar"
      className={cn("flex items-center", className)}
    >
      {menus.map((m) => (
        <DropdownMenu
          key={m.id}
          modal={false}
          open={open === m.id}
          onOpenChange={(o) => setOpen(o ? m.id : null)}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              role="menuitem"
              data-menubar-trigger={m.id}
              onPointerEnter={() => open && open !== m.id && setOpen(m.id)}
              onKeyDown={onTriggerKey(m.id)}
              className="h-[22px] shrink-0 rounded-[6px] px-[7px] text-[13px] leading-none text-foreground/75 outline-none transition-colors duration-100 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:bg-accent data-[state=open]:text-foreground"
            >
              {m.label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={6}
            className="min-w-56"
            onKeyDown={onContentKey(m.id)}
            onCloseAutoFocus={runner.onCloseAutoFocus}
          >
            <LiveEntries
              build={() => build().find((x) => x.id === m.id)?.items ?? []}
              run={runner.run}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
    </div>
  );
}

/** Every menu folded into one "..." button, for narrow screens. `lead` items go first (e.g. Present). */
export function OverflowMenu({
  build,
  lead,
  className,
}: {
  build: () => AppMenu[];
  lead?: MenuEntry[];
  className?: string;
}) {
  const runner = useRunner();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Menu"
          className={cn("shrink-0 text-muted-foreground", className)}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="min-w-52"
        onCloseAutoFocus={runner.onCloseAutoFocus}
      >
        <LiveEntries
          build={() => [
            ...(lead?.length ? [...lead, "separator" as const] : []),
            ...build().map((m) => ({
              id: `overflow.${m.id}`,
              label: m.label,
              items: m.items,
            })),
          ]}
          run={runner.run}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
