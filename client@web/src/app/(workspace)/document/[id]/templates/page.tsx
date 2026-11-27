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
    <PageBody title="Start something">
      <p className="-mt-5 mb-8 text-sm text-muted-foreground">
        Begin blank in any app, or from a ready-made document.
      </p>
      <Templates folderId={folderId} />
    </PageBody>
  );
}
