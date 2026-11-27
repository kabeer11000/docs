"use client";

import { useStore } from "@nanostores/react";
import {
  ArrowUpFromLine,
  FolderPlus,
  LayoutTemplate,
  PlusIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useCreateFile } from "@/hooks/use-create-file";
import { IMPORT_ACCEPT, useImportFiles } from "@/lib/import/use-import-files";
import { showToast } from "@/lib/toast";
import { $auth } from "@/state/auth";
import { templatesHref } from "../empty-state";
import { KIND, KINDS } from "../kind";

/** Folder the current page shows, so "New" creates inside it. */
export const folderFromPath = (pathname: string) =>
  pathname.match(/^\/folder\/([^/?#]+)/)?.[1];

/** "New" in the top bar: blank files, templates, a folder, or an import, created in the folder on screen. */
export function NewMenu() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { user, isLoading } = useStore($auth);
  const { createFolder, isReady } = useCloudStore();
  const { create, creating } = useCreateFile();
  const { importFiles, busy: importing } = useImportFiles();
  const importInput = useRef<HTMLInputElement>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const canCreate = !!user && !isLoading;
  const parent = folderFromPath(pathname) || user?.id;

  const newFolder = async () => {
    if (!isReady || creatingFolder || !user || !parent) return;
    setCreatingFolder(true);
    try {
      const id = await createFolder({
        folderId: parent,
        name: "Untitled Folder",
      });
      if (!id)
        showToast.error(
          "Failed to create folder",
          "Please check your connection and try again",
        );
    } catch (error) {
      console.error("Failed to create folder:", error);
      showToast.error(
        "Failed to create folder",
        "An unexpected error occurred",
      );
    } finally {
      // Blocks rapid repeat clicks while the list catches up.
      setTimeout(() => setCreatingFolder(false), 300);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            data-tour="new-document"
            aria-label="New"
            disabled={!canCreate || creating}
            className="h-9 gap-1.5 rounded-[10px] px-2.5 sm:px-3.5"
          >
            <PlusIcon className="size-[18px]" strokeWidth={2.5} />
            <span className="hidden sm:inline">New</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="min-w-56">
          {KINDS.map((kind) => {
            const k = KIND[kind];
            return (
              <DropdownMenuItem
                key={kind}
                className="h-9"
                onClick={() => parent && create(kind, parent)}
              >
                <k.icon className={k.text} strokeWidth={2.25} />
                {k.label}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => parent && router.push(templatesHref(parent))}
          >
            <LayoutTemplate />
            From template
          </DropdownMenuItem>
          <DropdownMenuItem disabled={creatingFolder} onClick={newFolder}>
            <FolderPlus />
            Folder
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={importing}
            onClick={() => importInput.current?.click()}
          >
            <ArrowUpFromLine />
            Import file
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={importInput}
        type="file"
        accept={IMPORT_ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length && parent)
            importFiles(e.target.files, parent);
          e.target.value = "";
        }}
      />
    </>
  );
}
