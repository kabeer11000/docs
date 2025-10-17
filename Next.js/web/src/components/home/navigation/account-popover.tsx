import { useStore } from "@nanostores/react";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  ChevronRight,
  CreditCard,
  Globe,
  HelpCircle,
  LogOut,
  Moon,
  Settings,
  Shield,
  Sun,
  User,
} from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import currentUser from "@/data/users/user.json";
import { $auth, auth } from "@/state/auth";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

export function AccountPopover() {
  const [open, setOpen] = useState(false);
  const { user } = useStore($auth);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Use auth store user data if available, fallback to static data
  const userData = user || currentUser;

  // Helper to get photo/avatar consistently
  const getPhoto = (): string | undefined => {
    if ("photoURL" in userData && userData.photoURL) return userData.photoURL;
    if ("avatar" in userData && userData.avatar)
      return userData.avatar as string;
    return undefined;
  };

  // Helper to get display name consistently
  const getDisplayName = (): string => {
    if ("displayName" in userData && userData.displayName)
      return userData.displayName;
    if ("name" in userData && userData.name) return userData.name as string;
    if ("email" in userData && userData.email) return userData.email;
    return "User";
  };

  const storagePercentage =
    ((currentUser.stats?.storageUsed || 0) /
      (currentUser.stats?.storageLimit || 1)) *
    100;

  const handleThemeToggle = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    // In a real app, this would update the global theme
  };

  const menuItems = [
    {
      icon: User,
      label: "Profile",
      href: "/profile",
      description: "Manage your account",
    },
    {
      icon: Settings,
      label: "Settings",
      href: "/settings",
      description: "Preferences and privacy",
    },
    {
      icon: Bell,
      label: "Notifications",
      href: "/settings/notifications",
      description: "Manage notifications",
    },
    {
      icon: CreditCard,
      label: "Billing",
      href: "/settings/billing",
      description: "Subscription and usage",
    },
    {
      icon: Shield,
      label: "Privacy & Security",
      href: "/settings/security",
      description: "Account security",
    },
    {
      icon: HelpCircle,
      label: "Help & Support",
      href: "/help",
      description: "Get help and support",
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="p-0 h-auto rounded-full">
          <Avatar className="w-8 h-8">
            <AvatarImage src={getPhoto()} alt={getDisplayName()} />
            <AvatarFallback>
              {getDisplayName()
                .split(" ")
                .map((n: string) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4">
          {/* User Info Header */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-12 h-12">
              <AvatarImage src={getPhoto()} alt={getDisplayName()} />
              <AvatarFallback>
                {getDisplayName()
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{getDisplayName()}</h3>
                <Badge variant="secondary" className="text-xs">
                  {(
                    ("@meta" in userData ? userData["@meta"]?.plan : null) ||
                    ("subscription" in userData
                      ? (userData.subscription as any)?.plan
                      : null) ||
                    "free"
                  ).toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {userData.email}
              </p>
              <p className="text-xs text-muted-foreground">
                {("organization" in userData
                  ? (userData.organization as any)?.role
                  : null) || "Member"}{" "}
                at{" "}
                {("organization" in userData
                  ? (userData.organization as any)?.name
                  : null) || "Individual"}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className="text-lg font-semibold">
                {currentUser.stats.filesCreated}
              </div>
              <div className="text-xs text-muted-foreground">Files Created</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className="text-lg font-semibold">
                {currentUser.stats.foldersCreated}
              </div>
              <div className="text-xs text-muted-foreground">Folders</div>
            </div>
          </div>

          {/* Storage Usage */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Storage used</span>
              <span className="font-medium">
                {formatBytes(currentUser.stats.storageUsed)} /{" "}
                {formatBytes(currentUser.stats.storageLimit)}
              </span>
            </div>
            <Progress value={storagePercentage} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {(100 - storagePercentage).toFixed(1)}% remaining
            </div>
          </div>

          <Separator className="my-4" />

          {/* Quick Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Theme</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleThemeToggle}
              className="h-8 w-8 p-0"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Separator className="my-4" />

          {/* Menu Items */}
          <div className="space-y-1">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                onClick={() => setOpen(false)}
              >
                <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </a>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Last Login */}
          <div className="text-xs text-muted-foreground mb-3">
            Last login:{" "}
            {formatDistanceToNow(new Date(currentUser.stats.lastLogin), {
              addSuffix: true,
            })}
          </div>

          {/* Logout */}
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={async () => {
              setOpen(false);
              await auth.logout();
              window.location.href = "/auth/login";
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
