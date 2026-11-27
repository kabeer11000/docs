"use client";

import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import { Greeting } from "@/components/home/home-sections";
import { HomeTabs } from "@/components/home/home-tabs";
import { PageBody } from "@/components/home/page-body";
import { TrashView } from "@/components/home/trash-view";
import { $auth } from "@/state/auth";
import { searchActions } from "@/state/search";

export default function TrashPage() {
  const { user } = useStore($auth);

  useEffect(() => {
    searchActions.setCurrentPage("trash");
  }, []);

  // The workspace layout only renders pages once signed in.
  if (!user) return null;

  return (
    <PageBody title={<Greeting />}>
      <HomeTabs active="trash" />
      <TrashView />
    </PageBody>
  );
}
