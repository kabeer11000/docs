"use client";

import { useStore } from "@nanostores/react";
import {
  ArrowUpFromLine,
  FolderPlus,
  LayoutTemplate,
  PlusIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCreateFile } from "@/hooks/use-create-file";
import { IMPORT_ACCEPT, useImportFiles } from "@/lib/import/use-import-files";
import { $auth } from "@/state/auth";
import { $newMenuOpen, newFolder } from "@/state/file-actions";
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
  const { create, creating } = useCreateFile();
  const { importFiles, busy: importing } = useImportFiles();
  const importInput = useRef<HTMLInputElement>(null);
  const open = useStore($newMenuOpen);

  const canCreate = !!user && !isLoading;
  const parent = folderFromPath(pathname) || user?.id;

  return (
    <>
      <DropdownMenu open={open} onOpenChange={$newMenuOpen.set}>
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
          <DropdownMenuItem onSelect={() => parent && newFolder(parent)}>
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
