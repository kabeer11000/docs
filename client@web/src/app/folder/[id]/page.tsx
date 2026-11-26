"use client";

import { useStore } from "@nanostores/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React, { use } from "react";
import { $auth } from "@/state/auth";
import ReactHome from "@/components/home";
import { PageBody } from "@/components/home/page-body";
import { useViewMode, ViewToggle } from "@/components/home/view-toggle";

const LiveListView = dynamic(
  () =>
    import("@/components/shared/ui/live-list-view").then((m) => ({
      default: m.LiveListView,
    })),
  { ssr: false },
);

const FolderBreadcrumbs = dynamic(
  () =>
    import("@/components/shared/ui/folder-breadcrumbs").then((m) => ({
      default: m.FolderBreadcrumbs,
    })),
  { ssr: false },
);

const FolderOptions = dynamic(
  () =>
    import("@/components/shared/ui/folder-options").then((m) => ({
      default: m.FolderOptions,
    })),
  { ssr: false },
);

export default function FolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const authState = useStore($auth);
  const [view, setView] = useViewMode();
  const p = use(params);
  const [folderId, setFolderId] = React.useState<string | null>(null);

  React.useEffect(() => {
      const id = p.id;
      // Redirect root folders to vault
      if (id === "root" || id === "home" || !id) {
        router.push("/vault");
        return;
      }
      // Redirect if folder ID matches current user ID
      if (authState.user && id === authState.user.id) {
        router.push("/vault");
        return;
      }
      setFolderId(id);
  }, [params, authState.user, router]);

  // Show loading while auth is initializing
  if (!authState.isInitialized || !authState.user || !folderId) {
    return <div className="h-svh bg-background" />;
  }

  return (
    <ReactHome pathname={`/folder/${folderId}`} folderId={folderId}>
      <PageBody
        title={<FolderBreadcrumbs folderId={folderId} />}
        actions={
          <div className="flex items-center gap-1">
            <FolderOptions folderId={folderId} />
            <ViewToggle view={view} onChange={setView} />
          </div>
        }
      >
        <LiveListView
          parent={folderId}
          showHeadline={false}
          collapsible={false}
          mode="folder-contents"
          view={view}
        />
      </PageBody>
    </ReactHome>
  );
}
