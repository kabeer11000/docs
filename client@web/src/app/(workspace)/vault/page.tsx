"use client";

import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import { Greeting } from "@/components/home/home-sections";
import { HomeTabs } from "@/components/home/home-tabs";
import { PageBody } from "@/components/home/page-body";
import { useViewMode, ViewToggle } from "@/components/home/view-toggle";
import { LiveListView } from "@/components/shared/ui/live-list-view";
import { $auth } from "@/state/auth";
import { searchActions } from "@/state/search";

export default function VaultPage() {
  const { user } = useStore($auth);
  const [view, setView] = useViewMode("vault");

  useEffect(() => {
    searchActions.setCurrentPage("vault");
  }, []);

  // The workspace layout only renders pages once signed in.
  if (!user) return null;

  return (
    <PageBody title={<Greeting />}>
      <HomeTabs
        active="vault"
        actions={<ViewToggle view={view} onChange={setView} />}
      />
      <LiveListView
        parent={user.id}
        showHeadline={false}
        defaultSortField="modified"
        collapsible={false}
        view={view}
        prefsKey="vault"
      />
    </PageBody>
  );
}
