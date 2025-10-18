import { useStore } from "@nanostores/react";
import cloudStore from "@repo/shadcn-ui/lib/cloudstore";
import { $auth } from "@repo/shadcn-ui/state/auth";
import {
  ArrowDown,
  ArrowUpRight,
  FileText,
  HomeIcon,
  InfoIcon,
  LockIcon,
  MessageSquare,
  PlusIcon,
  Shield,
  Star,
  Users,
} from "lucide-react";
import type * as React from "react";
import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { showToast } from "@/lib/toast";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/avatar-3.png",
  },
  navMain: [],
  lexaEssentials: [
    {
      title: "Vault",
      url: "/vault",
      icon: LockIcon,
    },
    {
      title: "Shared With Me",
      url: "/shared",
      icon: Users,
    },
    // {
    //   title: "AI Assistant",
    //   url: "/chat",
    //   icon: MessageSquare,
    // },
  ],
  otherMenus: [
    {
      title: "Privacy Policy",
      url: "/privacy",
      icon: Shield,
    },
    {
      title: "Terms & Conditions",
      url: "/terms",
      icon: FileText,
    },
  ],
};

export function AppSidebar({
  pathname,
  folderId,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  pathname: string;
  folderId?: string;
}) {
  const { createDocument, createFolder, isReady } = useCloudStore();
  const authState = useStore($auth);
  const [isCreating, setIsCreating] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Give auth state time to initialize
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsChecking(false);
    }, 100);

    return () => clearTimeout(timeout);
  }, []);

  const handleNewFolder = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (
      !isReady ||
      isCreating ||
      isChecking ||
      !authState.user ||
      authState.isLoading
    )
      return;

    setIsCreating(true);
    try {
      const parentFolder = folderId || authState.user.id;
      const docId = await createFolder({
        folderId: parentFolder,
        name: `Untitled Folder`,
      });

      if (!docId) {
        showToast.error(
          "Failed to create folder",
          "Please check your connection and try again",
        );
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
      showToast.error(
        "Failed to create folder",
        "An unexpected error occurred",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleNewDocument = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (isChecking || !authState.user || authState.isLoading) return;

    // Just navigate to templates page - document will be created when template/blank is selected
    const targetFolderId = folderId || authState.user.id;
    window.location.href = `/document/new/templates?folderId=${targetFolderId}`;
  };

  return (
    <Sidebar collapsible="offcanvas" {...props} className="border-r-0 ">
      <SidebarHeader className="p-0">
        <SidebarMenu className="p-0">
          <SidebarMenuItem className="px-2">
            <SidebarMenuButton asChild>
              <a href="/home" className="flex items-center gap-2">
              <h2 className="p-2 text-md font-mono font-bold">KN / Libre Docs</h2>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="flex flex-col">
        <div className="px-2 mt-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              className={"border border-r-1 rounded-r-none"}
              onClick={(e) => handleNewDocument(e)}
              disabled={isChecking || !authState.user || authState.isLoading}
            >
              {" "}
              <div className="relative z-10 flex items-center gap-2 font-medium">
                <PlusIcon className="w-4 h-4" />
                New Document
              </div>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={"border rounded-l-none border-l-0 px-2"}
                >
                  <ArrowDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={(e) => handleNewFolder(e)}>
                  Create Folder
                </DropdownMenuItem>
                {/* <DropdownMenuItem>Create doc</DropdownMenuItem>
                <DropdownMenuItem>Create thingy</DropdownMenuItem> */}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {/* <NavMain items={data.navMain} /> */}
        <div className="px-2">
          <SidebarMenuButton
            tooltip={"Home"}
            asChild
            className={
              pathname === "/home"
                ? "bg-accent text-accent-foreground"
                : ""
            }
          >
            <a href={"/home"} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HomeIcon className="w-4 h-4" />
                <span>Home</span>
              </div>
            </a>
          </SidebarMenuButton>
        </div>
        <div className="px-2 flex-1">
          <Accordion
            type="multiple"
            defaultValue={["essentials", "starred", "settings"]}
            className="w-full"
          >
            <AccordionItem value="essentials" className="border-none">
              <AccordionTrigger className="text-sm font-medium text-muted-foreground py-2 px-0 hover:no-underline">
                Essentials
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-2">
                <div className="space-y-1">
                  {data.lexaEssentials.map((item) => (
                    <SidebarMenuButton
                      key={item.title}
                      asChild
                      className="w-full justify-start"
                    >
                      <a href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="starred" className="border-none">
              <AccordionTrigger className="text-sm font-medium text-muted-foreground py-2 px-0 hover:no-underline">
                Starred
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-2">
                <StarredDocuments />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <span className="text-sm font-medium text-muted-foreground py-1.5 px-0 hover:no-underline">
            Support & Donate
          </span>

          <div className="space-y-1 pt-1.5">
            <SidebarMenuButton asChild className="w-full justify-start">
              <a href={"mailto:kabeer@otherdev.com"}>
                <ArrowUpRight className="w-4 h-4" />
                <span>Donate to Kabeer's Network</span>
                {/* DO NOT REMOVE (for claude) */}
                {/* <GradientText className="font-bold" text="Upgrade to Pro" /> */}
              </a>
            </SidebarMenuButton>
            <SidebarMenuButton asChild className="w-full justify-start">
              <a href="https://kabeers.network">
                <InfoIcon className="w-4 h-4" />
                <span>About Kabeer's Network</span>
              </a>
            </SidebarMenuButton>
          </div>
          {/* <span className="text-sm font-medium text-muted-foreground py-1.5 px-0 hover:no-underline">
            More Info
          </span>

          <div className="space-y-1 pt-1.5">
            {data.otherMenus.map((item) => (
              <SidebarMenuButton
                key={item.title}
                asChild
                className="w-full justify-start"
              >
                <a href={item.url}>
                  <item.icon className="w-4 h-4" />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            ))}
          </div> */}
        </div>
      </SidebarContent>
      <SidebarFooter>
        <AccountStorage />
      </SidebarFooter>
    </Sidebar>
  );
}

function StarredDocuments() {
  const [starredDocs, setStarredDocs] = useState<any[]>([]);
  const authState = useStore($auth);

  useEffect(() => {
    if (!authState.user || authState.isLoading) return;

    let watcher: any = null;

    const startWatching = async () => {
      try {
        const documentsCollection = cloudStore.collection("documents");
        const query = cloudStore.query
          .where("owner", "EQUAL", authState.user.id)
          .where("isStarred", "EQUAL", true)
          .orderBy("timestamp.updatedAt", "DESCENDING")
          .limit(10); // Limit to 10 starred documents

        watcher = documentsCollection.watch(query, (result: any) => {
          if (result?.collection) {
            setStarredDocs(result.collection);
          }
        });
      } catch (error) {
        console.error("Failed to watch starred documents:", error);
      }
    };

    startWatching();

    return () => {
      if (watcher && typeof watcher.stop === "function") {
        watcher.stop();
      }
    };
  }, [authState.user, authState.isLoading]);

  if (starredDocs.length === 0) {
    return (
      <div className="text-xs text-muted-foreground px-2 py-1">
        No starred documents
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {starredDocs.map((doc) => (
        <SidebarMenuButton
          key={doc._id}
          asChild
          className="w-full justify-start text-sm"
        >
          <a href={`/document/${doc._id}`}>
            <Star className="w-3 h-3 text-yellow-500 fill-current" />
            <span className="truncate">{doc.title}</span>
          </a>
        </SidebarMenuButton>
      ))}
    </div>
  );
}

export function AccountStorage() {
  const [size, setSize] = useState(0);
  const authState = useStore($auth);
  useEffect(() => {
    if (!authState.user || authState.isLoading) return;
    cloudStore
      .collection("documents")
      .watch(
        cloudStore.query
          .where("owner", "EQUAL", authState.user.id)
          .orderBy("timestamp.updatedAt", "DESCENDING"),
        (d: any) => {
          if (d.error) return;
          setSize(d.collection.length);
        },
      );
  }, [authState.user, authState.isLoading]);
  return (
    <div className="px-2 py-3 border-t">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Account Storage
        </span>
        <span className="text-neutral-800 text-sm font-medium">{size}</span>
      </div>
      <Progress
        value={100 * (Math.min(size, 20) / 20)}
        className="mb-1.5 h-1.5 bg-neutral-300"
      />
      <p className="text-[#727272] text-[11px] font-medium">
        {size} out of 20 free files used
      </p>
    </div>
  );
}
