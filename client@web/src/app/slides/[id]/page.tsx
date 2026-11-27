"use client";

import { useStore } from "@nanostores/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";
import { SlidesApp } from "@/components/slides/slides-app";
import { SlidesHeader } from "@/components/slides/slides-header";
import { $auth } from "@/state/auth";
import { searchActions } from "@/state/search";

const ReactHome = dynamic(() => import("@/components/home"), { ssr: true, loading: () => null });

export default function SlidesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const authState = useStore($auth);
  const ready = !!authState.user;
  const signedOut = authState.isInitialized && !authState.isLoading && !authState.user;

  useEffect(() => {
    if (signedOut) router.replace(`/auth/login?redirect=${encodeURIComponent(`/slides/${id}`)}`);
  }, [signedOut, router, id]);

  useEffect(() => {
    if (ready) searchActions.setCurrentPage(`slides/${id}`);
  }, [ready, id]);

  return (
    <ReactHome
      pathname={`/slides/${id}`}
      isEditorPage={true}
      hideSearch={true}
      editorHeaderContent={ready ? <SlidesHeader documentId={id} /> : <div className="h-5 w-48 animate-pulse rounded-sm bg-muted" />}
    >
      <div className="relative flex h-full flex-col overflow-hidden bg-background">{ready && <SlidesApp key={id} documentId={id} />}</div>
    </ReactHome>
  );
}
