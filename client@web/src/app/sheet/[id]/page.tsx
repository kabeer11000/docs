"use client";

import { useStore } from "@nanostores/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";
import { useLiveDocument } from "@/components/editor/core/use-document-loader";
import { SheetHeader, sheetHeaderPlaceholder } from "@/components/sheet/sheet-header";
import { fileHref, fileKind } from "@/lib/files";
import { $auth } from "@/state/auth";

const ReactHome = dynamic(() => import("@/components/home"), { ssr: true, loading: () => null });

const gridSkeleton = <div className="min-h-0 flex-1 animate-pulse bg-paper" />;

// The engine is large; only this route loads it, and only in the browser.
const SheetEditor = dynamic(() => import("@/components/sheet/sheet-editor"), { ssr: false, loading: () => gridSkeleton });

export default function SheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const authState = useStore($auth);
  const ready = !!authState.user;
  const signedOut = authState.isInitialized && !authState.isLoading && !authState.user;

  useEffect(() => {
    if (signedOut) router.replace(`/auth/login?redirect=${encodeURIComponent(`/sheet/${id}`)}`);
  }, [signedOut, router, id]);

  return (
    <ReactHome
      pathname={`/sheet/${id}`}
      isEditorPage={true}
      hideSearch={true}
      editorHeaderContent={ready ? <SheetHeader documentId={id} /> : sheetHeaderPlaceholder}
    >
      <div className="relative flex h-full flex-col overflow-hidden bg-background">
        {ready ? <SheetBody key={id} id={id} /> : gridSkeleton}
      </div>
    </ReactHome>
  );
}

function SheetBody({ id }: { id: string }) {
  const router = useRouter();
  const { document: doc, access } = useLiveDocument(id);
  const kind = doc ? fileKind(doc) : null;

  useEffect(() => {
    if (kind && kind !== "sheet") router.replace(fileHref(id, kind));
  }, [kind, id, router]);

  if (access === "denied" || access === "missing") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="font-serif text-lg font-medium">
          {access === "denied" ? "You do not have access to this spreadsheet" : "This spreadsheet does not exist"}
        </p>
        <Link href="/home" className="text-[13px] text-primary hover:underline">
          Go to your files
        </Link>
      </div>
    );
  }
  if (!doc || kind !== "sheet") return gridSkeleton;
  return <SheetEditor documentId={id} />;
}
