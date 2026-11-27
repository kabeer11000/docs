"use client";

import { useStore } from "@nanostores/react";
import { PenLine } from "lucide-react";
import {
  AppHeader,
  AppHeaderSkeleton,
} from "@/components/app-header/app-header";
import { useLiveDocument } from "@/components/editor/core/use-document-loader";
import { KIND } from "@/components/home/kind";
import { Button } from "@/components/ui/button";
import { useDocumentPermissions } from "@/hooks/use-document-permissions";
import type { FileKind } from "@/lib/files";
import { parsePdfData } from "@/lib/pdf/model";
import { pdfMenus } from "./pdf-menus";
import { $pdfCommands, $pdfSave } from "./pdf-state";

export const pdfHeaderPlaceholder = <AppHeaderSkeleton />;

// The shared header knows kinds from lib/files.ts; "pdf" joins that list when the lead wires it.
// Until then fall back to the document identity so the header never reads a missing entry.
const PDF_KIND = (
  (KIND as Record<string, unknown>).pdf ? "pdf" : "doc"
) as FileKind;

const formatBytes = (n: number) =>
  n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : `${(n / 1024 / 1024).toFixed(1)} MB`;

export function PdfHeader({ documentId }: { documentId: string }) {
  const { document: doc } = useLiveDocument(documentId);
  const permissions = useDocumentPermissions(doc);
  const save = useStore($pdfSave);
  const commands = useStore($pdfCommands);

  return (
    <AppHeader
      kind={PDF_KIND}
      doc={doc}
      permissions={permissions}
      status={save}
      menus={(file) => pdfMenus(file, commands)}
      details={() => {
        const data = parsePdfData((doc as { data?: unknown } | null)?.data);
        return data
          ? [
              ["Pages", String(data.pages.length)],
              ["Annotations", String(data.annotations.length)],
              ...(data.blob
                ? ([["File size", formatBytes(data.blob.size)]] as [
                    string,
                    string,
                  ][])
                : []),
            ]
          : [];
      }}
      primary={
        permissions.canEdit ? (
          <Button
            variant="outline"
            disabled={!commands}
            onClick={() => commands?.insert("signature")}
            className="h-9 rounded-full pr-4 pl-3.5"
          >
            <PenLine className="text-app" />
            Sign
          </Button>
        ) : undefined
      }
      overflowLead={
        permissions.canEdit
          ? [
              {
                id: "overflow.sign",
                label: "Sign",
                run: () => commands?.insert("signature"),
                disabled: !commands,
              },
            ]
          : undefined
      }
    />
  );
}
