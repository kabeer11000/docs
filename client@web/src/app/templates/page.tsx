"use client";

import { useStore } from "@nanostores/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { TemplateGallery } from "@/components/templates/template-gallery";
import { $auth } from "@/state/auth";

/** `/templates?kind=doc|sheet|slides&folderId=...`. Middleware already sends signed-out visitors to login. */
function TemplatesRoute() {
  const params = useSearchParams();
  const router = useRouter();
  const auth = useStore($auth);
  const signedOut = auth.isInitialized && !auth.isLoading && !auth.user;

  useEffect(() => {
    if (signedOut)
      router.replace(
        `/auth/login?redirect=${encodeURIComponent(`/templates?${params}`)}`,
      );
  }, [signedOut, router, params]);

  return (
    <TemplateGallery
      initialKind={params.get("kind")}
      folderId={params.get("folderId")}
    />
  );
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <TemplatesRoute />
    </Suspense>
  );
}
