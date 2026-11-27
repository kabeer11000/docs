import { useStore } from "@nanostores/react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Compass,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Shield,
  Sun,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { $auth, auth, getUserInitials } from "@/state/auth";
import { openSettingsDialog, type SettingsSection } from "@/state/settings-dialog";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

const menuItems: { icon: LucideIcon; label: string; section: SettingsSection }[] =
  [
    { icon: User, label: "Account", section: "account" },
    { icon: Settings, label: "Settings", section: "general" },
    { icon: Bell, label: "Notifications", section: "notifications" },
    { icon: Shield, label: "Privacy & security", section: "security" },
  ];

const itemClass =
  "flex h-8 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-[13px] text-foreground transition-colors hover:bg-accent [&_svg]:size-[15px] [&_svg]:text-muted-foreground";

interface AccountPopoverProps {
  /** Custom trigger (rendered asChild); defaults to an avatar icon button. */
  children?: ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "end";
}

export function AccountPopover({
  children,
  side = "bottom",
  align = "end",
}: AccountPopoverProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user } = useStore($auth);
  const { theme, setTheme } = useTheme();

  // next-themes only knows the theme on the client.
  useEffect(() => setMounted(true), []);

  const name = user?.displayName || user?.email || "User";
  const photo = user?.photoURL || "/avatars/avatar-3.png";
  const initials = getUserInitials(user) || "U";

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children ?? (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Account menu"
          >
            <Avatar className="size-7 bg-muted">
              <AvatarImage src={photo} alt="" />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 rounded-[14px] p-1.5" side={side} align={align} sideOffset={8}>
        <div className="flex items-center gap-3 px-2 pt-1.5 pb-2.5">
          <Avatar className="size-9 bg-muted">
            <AvatarImage src={photo} alt="" />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-semibold tracking-[-0.01em]">{name}</p>
            {user?.email && user.email !== name && (
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </div>

        <div className="px-2 pt-1 pb-2">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Theme
          </p>
          <div
            role="radiogroup"
            aria-label="Theme"
            className="grid grid-cols-3 gap-0.5 rounded-[10px] bg-muted p-0.5"
          >
            {themes.map((t) => {
              const selected = mounted && theme === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    "flex h-7 items-center justify-center gap-1.5 rounded-[8px] text-xs text-muted-foreground transition-colors hover:text-foreground",
                    selected && "bg-card font-medium text-foreground shadow-card",
                  )}
                >
                  <t.icon className="size-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <Separator className="my-1" />

        {menuItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={itemClass}
            onClick={run(() => openSettingsDialog(item.section))}
          >
            <item.icon />
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className={itemClass}
          onClick={run(() => window.dispatchEvent(new Event("docs:start-tour")))}
        >
          <Compass />
          Take the tour
        </button>

        <Separator className="my-1" />

        <button
          type="button"
          className={itemClass}
          onClick={run(async () => {
            await auth.logout();
            window.location.href = "/auth/login";
          })}
        >
          <LogOut />
          Sign out
        </button>
      </PopoverContent>
    </Popover>
  );
}
