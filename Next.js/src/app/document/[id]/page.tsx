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
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
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
    params.then((p) => setDocumentId(p.id));
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

    // Listen for AI panel state changes and update header
    const unsubscribe = editorUIState.subscribe((state) => {
      const header = document.querySelector("header");

      if (state.isAIPanelOpen) {
        if (header) {
          header.style.paddingRight = "320px";
          header.style.transition = "padding-right 0.3s ease-in-out";
        }
      } else {
        if (header) {
          header.style.paddingRight = "0";
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [authState.user, authState.isLoading, documentId, router, isChecking]);

  if (isChecking || authState.isLoading || !authState.user || !documentId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
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
        className="bg-neutral-200 h-full flex flex-col overflow-hidden relative"
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
