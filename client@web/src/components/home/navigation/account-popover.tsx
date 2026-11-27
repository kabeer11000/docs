import { useStore } from "@nanostores/react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Camera,
  Compass,
  KeyRound,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Shield,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect, useState } from "react";
import { useChangePhoto } from "@/components/avatar/use-change-photo";
import { UserAvatar } from "@/components/avatar/user-avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { $localPhotos } from "@/lib/auth/local-photo";
import { cn } from "@/lib/utils";
import { $auth, auth } from "@/state/auth";
import { $nothing, ownedCountWatch } from "@/state/live-queries";
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
  /** Custom trigger (rendered asChild); defaults to the user's avatar. */
  children?: ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "end";
}

const FREE_FILE_LIMIT = 200;

/** "9 of 200 files" with a thin meter. */
function StorageLine({ userId }: { userId?: string }) {
  const count = useStore(userId ? ownedCountWatch(userId) : $nothing);
  const used = count ?? 0;
  const pct = (100 * Math.min(used, FREE_FILE_LIMIT)) / FREE_FILE_LIMIT;
  return (
    <div className="px-2 pb-2.5">
      <p className="text-xs text-muted-foreground tabular-nums">
        {count === undefined ? " " : `${used} of ${FREE_FILE_LIMIT} files`}
      </p>
      <div
        className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Files used"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={FREE_FILE_LIMIT}
      >
        <div className="h-full rounded-full bg-foreground/70 transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
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
  const photos = useStore($localPhotos);
  const photo = useChangePhoto();

  // next-themes only knows the theme on the client.
  useEffect(() => setMounted(true), []);

  const name = user?.displayName || user?.email || "User";
  const hasPhoto = !!(user && photos[user.id]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children ?? (
          <button
            type="button"
            data-tour="account-menu"
            aria-label="Account menu"
            className="press flex size-9 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <UserAvatar id={user?.id} name={user?.displayName} email={user?.email} photoURL={user?.photoURL} decorative />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 rounded-[14px] p-1.5" side={side} align={align} sideOffset={8}>
        <div className="flex items-center gap-3 px-2 pt-1.5 pb-2.5">
          <UserAvatar id={user?.id} name={user?.displayName} email={user?.email} photoURL={user?.photoURL} size="lg" decorative />
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-semibold tracking-[-0.01em]">{name}</p>
            {user?.email && user.email !== name && (
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </div>

        <StorageLine userId={user?.id} />

        <button type="button" className={itemClass} disabled={photo.busy} onClick={run(photo.change)}>
          <Camera />
          {photo.busy ? "Saving photo..." : hasPhoto ? "Change photo" : "Add a photo"}
        </button>
        {hasPhoto && (
          <button type="button" className={itemClass} onClick={run(photo.remove)}>
            <Trash2 />
            Remove photo
          </button>
        )}

        <Separator className="my-1" />

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
        <Link href="/settings/api" className={itemClass} onClick={() => setOpen(false)}>
          <KeyRound />
          API keys
        </Link>
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
