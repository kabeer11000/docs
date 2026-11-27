"use client";

import { useStore } from "@nanostores/react";
import {
  AppHeader,
  AppHeaderSkeleton,
} from "@/components/app-header/app-header";
import { type SheetCommands, sheetMenus } from "@/components/app-header/menus";
import { useLiveDocument } from "@/components/editor/core/use-document-loader";
import { useDocumentPermissions } from "@/hooks/use-document-permissions";
import { showToast } from "@/lib/toast";
import { downloadSheet } from "./sheet-files";
import { $sheetEngine, $sheetSave } from "./sheet-state";

export const sheetHeaderPlaceholder = <AppHeaderSkeleton />;

export function SheetHeader({ documentId }: { documentId: string }) {
  const { document: doc } = useLiveDocument(documentId);
  const permissions = useDocumentPermissions(doc);
  const engine = useStore($sheetEngine);
  const save = useStore($sheetSave);

  const download = async (kind: "csv" | "xlsx" | "pdf") => {
    if (!engine || !doc) return;
    try {
      await downloadSheet(kind, doc.title, engine.activeSheet());
    } catch (error) {
      showToast.error(
        "Download failed",
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  return (
    <AppHeader
      kind="sheet"
      doc={doc}
      permissions={permissions}
      status={{ state: save.status, error: save.error }}
      menus={(file) =>
        sheetMenus({
          ...file,
          hasEngine: !!engine,
          // The grid may offer more commands than the header's type knows about (undo, rows, sort, filter).
          commands: (engine ?? {}) as SheetCommands,
          download: (kind) => void download(kind),
        })
      }
    />
  );
}
