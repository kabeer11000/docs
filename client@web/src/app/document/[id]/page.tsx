"use client";

import { useStore } from "@nanostores/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { $auth } from "@/state/auth";
import { editorUIState } from "@/state/editor";
import { searchActions } from "@/state/search";

// Lazy load heavy components
const Editor = dynamic(() => import("@/components/editor/editor"), {
  ssr: false,
  loading: () => (
    <>
      {/* Editor toolbar skeleton */}
      <div className="sticky top-0 bg-background z-[10] editor-toolbar border-b">
        <div className="flex items-center w-full px-4 gap-2 h-14">
          <div className="flex-1 min-w-0 overflow-x-auto">
            <div className="h-10 w-full bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8 bg-muted w-full">
        <div className="max-w-4xl mx-auto">
          <div className="bg-background w-full min-h-[calc(100vh-10rem)] rounded-lg p-8">
            <div className="space-y-4">
              <div className="h-8 bg-muted/50 rounded w-3/4 animate-pulse"></div>
              <div className="h-6 bg-muted/50 rounded w-full animate-pulse"></div>
              <div className="h-6 bg-muted/50 rounded w-full animate-pulse"></div>
              <div className="h-6 bg-muted/50 rounded w-5/6 animate-pulse"></div>
              <div className="h-6 bg-muted/50 rounded w-4/6 animate-pulse"></div>
              <div className="h-6 bg-muted/50 rounded w-5/6 animate-pulse"></div>
              <div className="h-6 bg-muted/50 rounded w-full animate-pulse"></div>
              <div className="h-6 bg-muted/50 rounded w-2/3 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Status bar skeleton */}
      <div className="sticky bottom-0 editor-status-bar border-t">
        <div className="h-10 bg-muted animate-pulse rounded" />
      </div>
    </>
  ),
});

const EditorHeaderContent = dynamic(
  () =>
    import("@/components/editor/editor-header-content").then((m) => ({
      default: m.EditorHeaderContent,
    })),
  { ssr: false },
);

const ReactHome = dynamic(() => import("@/components/home"), {
  ssr: false,
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

    // Listen for AI panel and comments sidebar state changes and update header
    const unsubscribe = editorUIState.subscribe((state) => {
      const header = document.querySelector("header");

      const isSidebarOpen = state.isAIPanelOpen || state.isCommentsSidebarOpen;
      const totalSidebarWidth = (state.isAIPanelOpen ? 320 : 0) + (state.isCommentsSidebarOpen ? 320 : 0);

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
          <div className="flex items-center justify-between w-full">
            <div className="h-8 w-64 bg-muted rounded animate-pulse" />
            <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          </div>
        }
      >
        <div className="bg-background h-full flex flex-col overflow-hidden relative">
          {/* Editor toolbar skeleton */}
          <div className="sticky top-0 bg-background z-[10] editor-toolbar border-b">
            <div className="flex items-center w-full px-4 gap-2 h-14">
              <div className="flex-1 min-w-0 overflow-x-auto">
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
          
          {/* Editor content skeleton */}
          <div className="flex-1 overflow-y-auto p-8 bg-muted">
            <div className="max-w-4xl mx-auto">
              <div className="bg-background w-full min-h-[calc(100vh-10rem)] rounded-lg p-8">
                <div className="space-y-4">
                  <div className="h-8 bg-muted/50 rounded w-3/4 animate-pulse"></div>
                  <div className="h-6 bg-muted/50 rounded w-full animate-pulse"></div>
                  <div className="h-6 bg-muted/50 rounded w-full animate-pulse"></div>
                  <div className="h-6 bg-muted/50 rounded w-5/6 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Status bar skeleton */}
          <div className="sticky bottom-0 editor-status-bar border-t">
            <div className="h-10 bg-muted animate-pulse rounded" />
          </div>
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
