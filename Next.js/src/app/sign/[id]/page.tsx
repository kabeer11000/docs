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
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Document Signing</h1>
        <p className="text-neutral-600">Document ID: {documentId}</p>
        <p className="mt-4 text-sm text-neutral-500">
          This feature is under development
        </p>
      </div>
    </div>
  );
}
