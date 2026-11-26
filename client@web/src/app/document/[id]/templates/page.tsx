"use client";

import { useSearchParams } from "next/navigation";
import React from "react";
import { searchActions } from "@/state/search";
import ReactHome from "@/components/home"
import { Templates } from "@/components/create/app-templates"
export default function DocumentTemplatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const searchParams = useSearchParams();
  const [_documentId, setDocumentId] = React.useState<string | null>(null);
  const [folderId, setFolderId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then((p) => {
      // If id is "new", don't set documentId (document will be created when template is selected)
      if (p.id !== "new") {
        setDocumentId(p.id);
      }
    });
  }, [params]);

  React.useEffect(() => {
    // Get folderId from query params
    const folderIdParam = searchParams.get("folderId");
    if (folderIdParam) {
      setFolderId(folderIdParam);
    }
  }, [searchParams]);

  // Set current page for search context
  React.useEffect(() => {
    searchActions.setCurrentPage("templates");
    return () => {
      searchActions.setCurrentPage("home");
    };
  }, []);

  return (
    <ReactHome pathname="/templates" hideSearch={false}>
      <div className="px-6 py-10 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <h1 className="font-serif text-2xl font-medium tracking-[-0.015em] text-foreground">
              Start from a template
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Pick a starting point, or begin with a blank page.
            </p>
          </div>
          <Templates folderId={folderId} />
        </div>
      </div>
    </ReactHome>
  );
}
