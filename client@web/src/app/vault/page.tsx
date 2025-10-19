"use client";

import { useStore } from "@nanostores/react";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { $auth } from "@/state/auth";
import { searchActions } from "@/state/search";

// Lazy load heavy components
const ReactHome = dynamic(() => import("@/components/home"), {
  ssr: true,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
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

export default function VaultPage() {
  const authState = useStore($auth);

  useEffect(() => {
    if (authState.isInitialized && authState.user) {
      searchActions.setCurrentPage("vault");
    }
  }, [authState.isInitialized, authState.user]);

  // Show loading while auth is initializing
  if (!authState.isInitialized || !authState.user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <ReactHome pathname="/vault">
      <div className="px-2 py-2 md:px-4 relative">
        <div className="max-w-7xl mx-auto flex flex-col gap-y-4">
          <div>
            <LiveListView
              headlineText="Vault"
              parent={authState.user.id}
              showHeadline={true}
              defaultSortField="modified"
              collapsible={true}
              sortable={true}
            />
          </div>
        </div>
      </div>
    </ReactHome>
  );
}
