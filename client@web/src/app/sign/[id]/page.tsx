"use client";

import { useStore } from "@nanostores/react";
import { useRouter } from "next/navigation";
import React from "react";
import { $auth } from "@/state/auth";

export default function SignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { user } = useStore($auth);
  const [documentId, setDocumentId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then((p) => setDocumentId(p.id));
  }, [params]);

  React.useEffect(() => {
    if (!user) {
      router.push("/auth/login");
    }
  }, [user, router]);

  if (!user || !documentId) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <h1 className="mb-2 font-serif text-xl font-medium tracking-[-0.01em] text-foreground">
          Document signing
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Signing from a link is not available yet. Open the document from
          your home page to sign it.
        </p>
        <p className="mt-3 text-xs tabular-nums text-muted-foreground">
          {documentId}
        </p>
      </div>
    </div>
  );
}
