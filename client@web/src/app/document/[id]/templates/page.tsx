"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import React from "react";
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

const Templates = dynamic(
  () =>
    import("@/components/create/app-templates").then((m) => ({
      default: m.Templates,
    })),
  {
    ssr: true,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    ),
  },
);

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
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Choose a Template</h1>
            <p className="text-neutral-600">
              Select a template to start your document
            </p>
          </div>
          <Templates folderId={folderId} />
        </div>
      </div>
    </ReactHome>
  );
}
