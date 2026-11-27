"use client";

import "@/components/pdf/pdf-layers.css";
import { useStore } from "@nanostores/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";
import { useLiveDocument } from "@/components/editor/core/use-document-loader";
import { PdfHeader, pdfHeaderPlaceholder } from "@/components/pdf/pdf-header";
import { type FileKind, fileHref } from "@/lib/files";
import { $auth } from "@/state/auth";

const ReactHome = dynamic(() => import("@/components/home"), {
  ssr: true,
  loading: () => null,
});

const skeleton = <div className="min-h-0 flex-1 animate-pulse bg-background" />;

// pdf.js and pdf-lib are large; only this route loads them, and only in the browser.
const PdfEditor = dynamic(() => import("@/components/pdf/pdf-editor"), {
  ssr: false,
  loading: () => skeleton,
});

export default function PdfPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const authState = useStore($auth);
  const ready = !!authState.user;
  const signedOut =
    authState.isInitialized && !authState.isLoading && !authState.user;

  useEffect(() => {
    if (signedOut)
      router.replace(
        `/auth/login?redirect=${encodeURIComponent(`/pdf/${id}`)}`,
      );
  }, [signedOut, router, id]);

  return (
    <ReactHome
      pathname={`/pdf/${id}`}
      isEditorPage={true}
      hideSearch={true}
      editorHeaderContent={
        ready ? <PdfHeader documentId={id} /> : pdfHeaderPlaceholder
      }
    >
      <div
        data-app="pdf"
        className="relative flex h-full flex-col overflow-hidden bg-background"
      >
        {ready ? <PdfBody key={id} id={id} /> : skeleton}
      </div>
    </ReactHome>
  );
}

function PdfBody({ id }: { id: string }) {
  const router = useRouter();
  const { document: doc, access } = useLiveDocument(id);
  // "pdf" is not in FileKind until lib/files.ts learns it; compare as a plain string.
  const kind = doc ? ((doc as { kind?: string }).kind ?? "doc") : null;

  useEffect(() => {
    if (kind && kind !== "pdf") router.replace(fileHref(id, kind as FileKind));
  }, [kind, id, router]);

  if (access === "denied" || access === "missing") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="font-display text-lg font-semibold tracking-[-0.02em]">
          {access === "denied"
            ? "You do not have access to this PDF"
            : "This PDF does not exist"}
        </p>
        <Link href="/home" className="text-[13px] text-app hover:underline">
          Go to your files
        </Link>
      </div>
    );
  }
  if (!doc || kind !== "pdf") return skeleton;
  return <PdfEditor documentId={id} />;
}
