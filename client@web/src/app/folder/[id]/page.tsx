"use client";

import { useStore } from "@nanostores/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React from "react";
import { $auth } from "@/state/auth";

// Lazy load heavy components
const ReactHome = dynamic(() => import("@/components/home"), {
  ssr: true,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      {/* <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /> */}
    </div>
  ),
});

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
  const [folderId, setFolderId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then((p) => {
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
    });
  }, [params, authState.user, router]);

  // Show loading while auth is initializing
  if (!authState.isInitialized || !authState.user || !folderId) {
    return (
      <div className="flex items-center justify-center h-screen">
        {/* <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /> */}
      </div>
    );
  }

  return (
    <ReactHome pathname={`/folder/${folderId}`} folderId={folderId}>
      <div className="px-2 md:px-4 py-2">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center sticky top-2 justify-between mb-0 z-10 rounded-full">
            <div className="flex-1">
              <div className="flex items-center gap-2 w-full text-left">
                <button
                  type="button"
                  className="backdrop-blur-sm py-4 inline-flex items-center justify-center duration-150 gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 h-10 px-6 has-[>svg]:px-4 rounded-full border"
                >
                  <FolderBreadcrumbs folderId={folderId} />
                </button>
              </div>
            </div>
            <div>
              <FolderOptions folderId={folderId} />
            </div>
          </div>

          <LiveListView
            parent={folderId}
            showHeadline={false}
            mode="folder-contents"
          />
        </div>
      </div>
    </ReactHome>
  );
}
