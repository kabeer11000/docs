"use client";

import { useStore } from "@nanostores/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { $auth } from "@/state/auth";
import { searchActions } from "@/state/search";

// Lazy load heavy components
const AI = dynamic(() => import("@/components/ai/ai"), {
  ssr: true,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  ),
});

const ReactHome = dynamic(() => import("@/components/ai"), {
  ssr: true,
  loading: () => null,
});

export default function ChatIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const authState = useStore($auth);
  const [resolvedParams, setResolvedParams] = React.useState<{
    id: string;
  } | null>(null);
  const [isChecking, setIsChecking] = React.useState(true);

  React.useEffect(() => {
    params.then(setResolvedParams);
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

    if (authState.user) {
      // Set the current page context for search
      searchActions.setCurrentPage("home");
    }
  }, [authState.user, authState.isLoading, router, isChecking]);

  if (isChecking || authState.isLoading || !authState.user || !resolvedParams) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <ReactHome
      pathname={`/chat/${resolvedParams.id}`}
      chatId={resolvedParams.id}
    >
      <AI id={resolvedParams.id} />
    </ReactHome>
  );
}
