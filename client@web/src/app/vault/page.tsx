"use client";

import { useStore } from "@nanostores/react";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { PageBody } from "@/components/home/page-body";
import { useViewMode, ViewToggle } from "@/components/home/view-toggle";
import { $auth } from "@/state/auth";
import { searchActions } from "@/state/search";

// Lazy load heavy components
const ReactHome = dynamic(() => import("@/components/home"), {
  ssr: true,
  loading: () => <div className="h-svh bg-background" />,
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
  const [view, setView] = useViewMode();

  useEffect(() => {
    if (authState.isInitialized && authState.user) {
      searchActions.setCurrentPage("vault");
    }
  }, [authState.isInitialized, authState.user]);

  // Show loading while auth is initializing
  if (!authState.isInitialized || !authState.user) {
    return <div className="h-svh bg-background" />;
  }

  return (
    <ReactHome pathname="/vault">
      <PageBody title="Vault" actions={<ViewToggle view={view} onChange={setView} />}>
        <LiveListView
          parent={authState.user.id}
          showHeadline={false}
          defaultSortField="modified"
          collapsible={false}
          sortable={true}
          view={view}
        />
      </PageBody>
    </ReactHome>
  );
}
