"use client";

import { useStore } from "@nanostores/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { $auth } from "@/state/auth";
import { searchActions } from "@/state/search";

// Lazy load heavy components
const AI = dynamic(() => import("@/components/ai/ai"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  ),
});

const ReactHome = dynamic(() => import("@/components/ai"), {
  ssr: false,
  loading: () => null,
});

export default function ChatPage() {
  const router = useRouter();
  const authState = useStore($auth);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Give auth state time to initialize
    const timeout = setTimeout(() => {
      setIsChecking(false);
    }, 100);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    // Don't redirect while still checking
    if (isChecking) return;

    if (!authState.user && !authState.isLoading) {
      router.push("/auth/login");
      return;
    }

    if (authState.user) {
      // Set the current page context for search
      searchActions.setCurrentPage("home");
    }
  }, [authState.user, authState.isLoading, router, isChecking]);

  if (isChecking || authState.isLoading || !authState.user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // Render chat interface without a chat ID - will be created on first message
  return (
    <ReactHome pathname="/chat" chatId={undefined}>
      <AI id={undefined} />
    </ReactHome>
  );
}
