import { useStore } from "@nanostores/react";
import { Loader2, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useCreateFile } from "@/hooks/use-create-file";
import type { FileKind } from "@/lib/files";
import { $auth } from "@/state/auth";
import { CreateTiles } from "./create-tiles";
import { KIND } from "./kind";

export const templatesHref = (folderId: string) =>
  `/document/new/templates?folderId=${folderId}`;

interface EmptyStateProps {
  title: string;
  description: ReactNode;
  /** Folder new files are created in; omit to hide the create tiles. */
  folderId?: string;
  /** Offer one kind only (a filtered list), as a single button instead of the tiles. */
  kind?: FileKind;
  /** Leave out the create tiles (the page already shows them). */
  quiet?: boolean;
}

export function EmptyState({
  title,
  description,
  folderId,
  kind,
  quiet,
}: EmptyStateProps) {
  const { user } = useStore($auth);
  const { create, creating } = useCreateFile();
  const parent = folderId || user?.id || "";

  return (
    <div className="flex flex-col items-center rounded-[14px] px-4 py-12 text-center">
      <h3 className="font-display text-2xl font-semibold tracking-[-0.02em] text-balance text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm text-balance text-muted-foreground">
        {description}
      </p>
      {folderId !== undefined && kind && (
        <Button
          className="mt-6"
          onClick={() => create(kind, parent)}
          disabled={creating || !user}
        >
          {creating ? <Loader2 className="animate-spin" /> : <Plus />}
          New {KIND[kind].label.toLowerCase()}
        </Button>
      )}
      {folderId !== undefined && !kind && !quiet && (
        <>
          <CreateTiles
            folderId={parent}
            className="mt-8 w-full max-w-4xl text-left"
          />
          <Button variant="link" asChild className="mt-4 text-muted-foreground">
            <Link href={templatesHref(parent)}>Or start from a template</Link>
          </Button>
        </>
      )}
    </div>
  );
}
