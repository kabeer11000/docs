"use client";

import { useStore } from "@nanostores/react";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { $auth } from "@/state/auth";
import { searchActions } from "@/state/search";
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

export default function SharedPage() {
  const authState = useStore($auth);
  const [view, setView] = useViewMode();

  useEffect(() => {
    if (authState.isInitialized && authState.user) {
      searchActions.setCurrentPage("shared");
    }
  }, [authState.isInitialized, authState.user]);

  // Show loading while auth is initializing
  if (!authState.isInitialized || !authState.user) {
    return <div className="h-svh bg-background" />;
  }

  return (
    <ReactHome pathname="/shared">
      <PageBody title="Shared with me" actions={<ViewToggle view={view} onChange={setView} />}>
        <LiveListView
          showHeadline={false}
          creationParent={authState.user.id}
          defaultSortField="modified"
          collapsible={false}
          mode="shared-with-me"
          view={view}
        />
      </PageBody>
    </ReactHome>
  );
}
