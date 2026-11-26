"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Templates } from "@/components/create/app-templates";
import { PageBody } from "@/components/home/page-body";
import { searchActions } from "@/state/search";

// The [id] segment is "new" (or an id); documents are created when a template is picked.
export default function DocumentTemplatesPage() {
  const folderId = useSearchParams().get("folderId");

  useEffect(() => {
    searchActions.setCurrentPage("templates");
    return () => searchActions.setCurrentPage("home");
  }, []);

  return (
    <PageBody title="Start from a template">
      <p className="-mt-6 mb-8 text-sm text-muted-foreground">
        Pick a starting point, or begin with a blank page.
      </p>
      <Templates folderId={folderId} />
    </PageBody>
  );
}
