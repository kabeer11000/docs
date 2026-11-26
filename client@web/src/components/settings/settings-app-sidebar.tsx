import { Home, MessageSquare, Plus, Settings, User } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
// import { NavUser } from "@/components/home/nav-user" // Commented out - not used
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "User",
    email: "m@example.com",
    avatar: "/avatars/avatar-3.png",
  },
  navItems: [
    {
      title: "New Document",
      url: "/new",
      icon: Plus,
      isActive: false,
    },
    {
      title: "Home",
      url: "/home",
      icon: Home,
      isActive: false,
    },
    {
      title: "Assistant",
      url: "/chat",
      icon: MessageSquare,
      isActive: false,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      isActive: true,
    },
    {
      title: "Account",
      url: "#",
      icon: User,
      isActive: false,
    },
  ],
};

export function SettingsAppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props} className="border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <span className="text-base font-semibold">Kabeer Docs</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="flex flex-col overflow-y-auto scrollbar-hide">
        {/* Navigation Items */}
        <div className="px-2 space-y-1 mb-4">
          {data.navItems.map((item) => (
            <SidebarMenuButton
              key={item.title}
              asChild
              className={`w-full justify-start ${
                item.isActive ? "bg-accent font-medium text-foreground" : ""
              }`}
            >
              <a href={item.url}>
                <item.icon className="w-4 h-4" />
                <span>{item.title}</span>
              </a>
            </SidebarMenuButton>
          ))}
        </div>

        {/* Storage Overview - light styling to match sidebar */}
        <div className="px-4 pb-4 mt-auto">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Storage
          </p>
          <Card className="border border-border shadow-none">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground">
                  Total files
                </span>
                <span className="text-sm font-medium text-foreground tabular-nums">
                  127
                </span>
              </div>
              <Progress value={85} className="mb-2 h-1.5" />
              <p className="text-xs text-muted-foreground">
                4.25 GB of 5GB used
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Upgrade Storage Button */}
        <div className="px-4 pb-4">
          <Button
            variant="ghost"
            className="w-full justify-between text-muted-foreground"
          >
            <span className="text-sm">Upgrade storage</span>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </SidebarContent>

      <SidebarFooter></SidebarFooter>
    </Sidebar>
  );
}
