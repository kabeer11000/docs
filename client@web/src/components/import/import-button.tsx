"use client";

import { Loader2, Upload } from "lucide-react";
import { type ComponentProps, useRef } from "react";
import { Button } from "@/components/ui/button";
import { IMPORT_ACCEPT, useImportFiles } from "@/lib/import/use-import-files";

type ImportButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "type"> & {
  /** Folder for the new files (defaults to the user's root). */
  folderId?: string;
};

/** Opens a file picker and imports every chosen file (docx, pdf, md, html, txt, xlsx, csv, pptx). */
export function ImportButton({ folderId, children, disabled, ...props }: ImportButtonProps) {
  const input = useRef<HTMLInputElement>(null);
  const { importFiles, busy } = useImportFiles();
  return (
    <>
      <Button type="button" variant="outline" {...props} disabled={disabled || busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="animate-spin" /> : <Upload />}
        {children ?? "Import"}
      </Button>
      <input
        ref={input}
        type="file"
        multiple
        accept={IMPORT_ACCEPT}
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) void importFiles(files, folderId);
        }}
      />
    </>
  );
}
