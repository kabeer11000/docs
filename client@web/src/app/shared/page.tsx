"use client";

import { useStore } from "@nanostores/react";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { $auth } from "@/state/auth";
import { searchActions } from "@/state/search";

// Lazy load heavy components
const ReactHome = dynamic(() => import("@/components/home"), {
  ssr: false,
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

export default function SharedPage() {
  const authState = useStore($auth);

  useEffect(() => {
    if (authState.isInitialized && authState.user) {
      searchActions.setCurrentPage("shared");
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
    <ReactHome pathname="/shared">
      <div className="px-2 md:px-4 py-2">
        <div className="mx-auto max-w-7xl flex flex-col gap-y-8">
          <LiveListView
            headlineText="Shared with me"
            showHeadline={true}
            defaultSortField="modified"
            collapsible={true}
            mode="shared-with-me"
          />
        </div>
      </div>
    </ReactHome>
  );
}
