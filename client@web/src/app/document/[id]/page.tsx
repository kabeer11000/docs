"use client";

import { useStore } from "@nanostores/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";
import Editor from "@/components/editor/editor";
import { EditorHeaderContent } from "@/components/editor/editor-header-content";
import { EditorSkeleton } from "@/components/editor/editor-skeleton";
import { $auth } from "@/state/auth";
import { editorUIState } from "@/state/editor";
import { searchActions } from "@/state/search";

// The editor is part of this route's chunk (prefetched with the route) instead of a second
// dynamic import that only starts after the page has mounted.
const ReactHome = dynamic(() => import("@/components/home"), {
  ssr: true,
  loading: () => null,
});

const headerPlaceholder = (
  <div className="flex w-full items-center justify-between gap-4">
    <div className="flex items-center gap-2">
      <div className="hidden size-8 sm:block" />
      <div className="h-5 w-48 rounded-sm bg-muted animate-pulse" />
    </div>
    <div className="h-8 w-20 rounded-md bg-muted animate-pulse" />
  </div>
);

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = use(params);
  const router = useRouter();
  const authState = useStore($auth);
  const ready = !!authState.user;
  // Same gate as the workspace layout: only a settled, signed-out state redirects.
  const signedOut = authState.isInitialized && !authState.isLoading && !authState.user;

  useEffect(() => {
    // Social previews pass ?title=<base64>; show it until the document loads.
    const encodedTitle = new URLSearchParams(window.location.search).get("title");
    if (encodedTitle) {
      try {
        document.title = `${atob(encodedTitle)} - Docs`;
      } catch {
        /* ignore malformed title */
      }
    }
  }, []);

  useEffect(() => {
    if (signedOut) router.replace(`/auth/login?redirect=${encodeURIComponent(`/document/${documentId}`)}`);
  }, [signedOut, router, documentId]);

  useEffect(() => {
    if (!ready) return;
    searchActions.setCurrentPage(`document/${documentId}`);
    // Keep the header clear of the open side panels (desktop only).
    return editorUIState.subscribe((state) => {
      const header = document.querySelector("header");
      if (!header) return;
      const isDesktop = window.innerWidth >= 768;
      const width = isDesktop ? (state.isAIPanelOpen ? 320 : 0) + (state.isCommentsSidebarOpen ? 320 : 0) : 0;
      const value = `${width}px`;
      if (header.style.paddingRight !== value) {
        header.style.paddingRight = value;
        header.style.transition = "padding-right 0.3s ease-in-out";
      }
    });
  }, [ready, documentId]);

  return (
    <ReactHome
      pathname={`/document/${documentId}`}
      isEditorPage={true}
      hideSearch={true}
      editorHeaderContent={ready ? <EditorHeaderContent documentId={documentId} /> : headerPlaceholder}
    >
      <div className="relative flex h-full flex-col overflow-hidden bg-background" id="editor-container">
        {ready ? <Editor key={documentId} documentId={documentId} hocusPocusHost="http://localhost:4321" /> : <EditorSkeleton />}
      </div>
    </ReactHome>
  );
}
