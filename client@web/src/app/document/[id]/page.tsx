"use client";

import { useStore } from "@nanostores/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { $auth } from "@/state/auth";
import { editorUIState } from "@/state/editor";
import { searchActions } from "@/state/search";
import { EditorSkeleton as DocumentSkeleton } from "@/components/editor/editor-skeleton";

// Lazy load heavy components
const Editor = dynamic(() => import("@/components/editor/editor"), {
  ssr: true,
  loading: () => <DocumentSkeleton />,
});

const EditorHeaderContent = dynamic(
  () =>
    import("@/components/editor/editor-header-content").then((m) => ({
      default: m.EditorHeaderContent,
    })),
  { ssr: false },
);

const ReactHome = dynamic(() => import("@/components/home"), {
  ssr: true,
  loading: () => null,
});

export default function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const authState = useStore($auth);
  const [documentId, setDocumentId] = React.useState<string | null>(null);
  const [isChecking, setIsChecking] = React.useState(true);

  React.useEffect(() => {
    params.then((p) => {
      setDocumentId(p.id);
      
      // Check URL for title parameter and set initial page title for SSR/social previews
      const urlParams = new URLSearchParams(window.location.search);
      const encodedTitle = urlParams.get('title');
      if (encodedTitle) {
        try {
          const decodedTitle = atob(encodedTitle);
          document.title = `${decodedTitle} - Docs`;
        } catch (e) {
          console.error('Failed to decode title parameter:', e);
        }
      }
    });
  }, [params]);

  React.useEffect(() => {
    // Give auth state time to initialize
    const timeout = setTimeout(() => {
      setIsChecking(false);
    }, 100);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    // Don't redirect while still checking
    if (isChecking) return;

    // Check if user is authenticated
    if (!authState.user && !authState.isLoading) {
      router.push("/auth/login");
      return;
    }

    if (!documentId) {
      return;
    }

    if (authState.user) {
      // Set the current page context for search
      searchActions.setCurrentPage(`document/${documentId}`);
    }

    // Listen for AI panel and comments sidebar state changes and update header (desktop only)
    const unsubscribe = editorUIState.subscribe((state) => {
      const header = document.querySelector("header");

      // Only apply padding on desktop (md breakpoint = 768px)
      const isDesktop = window.innerWidth >= 768;
      const totalSidebarWidth = isDesktop ? (state.isAIPanelOpen ? 320 : 0) + (state.isCommentsSidebarOpen ? 320 : 0) : 0;

      if (header) {
        header.style.paddingRight = `${totalSidebarWidth}px`;
        header.style.transition = "padding-right 0.3s ease-in-out";
      }
    });

    return () => {
      unsubscribe();
    };
  }, [authState.user, authState.isLoading, documentId, router, isChecking]);

  if (isChecking || authState.isLoading || !authState.user || !documentId) {
    return (
      <ReactHome
        pathname={`/document/${documentId}`}
        isEditorPage={true}
        hideSearch={true}
        editorHeaderContent={
          <div className="flex items-center justify-between w-full gap-4">
            <div className="h-6 w-56 rounded-md bg-muted animate-pulse" />
            <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
          </div>
        }
      >
        <div className="bg-background h-full flex flex-col overflow-hidden relative">
          <DocumentSkeleton />
        </div>
      </ReactHome>
    );
  }

  return (
    <ReactHome
      pathname={`/document/${documentId}`}
      isEditorPage={true}
      hideSearch={true}
      editorHeaderContent={<EditorHeaderContent documentId={documentId} />}
    >
      <div
        className="bg-background h-full flex flex-col overflow-hidden relative"
        id="editor-container"
      >
        <Editor
          documentId={documentId}
          hocusPocusHost="http://localhost:4321"
        />
      </div>
    </ReactHome>
  );
}
