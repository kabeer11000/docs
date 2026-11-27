import { useStore } from "@nanostores/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCreateFile } from "@/hooks/use-create-file";
import { $auth } from "@/state/auth";
import { PaperSheet } from "./paper-sheet";

export const templatesHref = (folderId: string) =>
  `/document/new/templates?folderId=${folderId}`;

interface EmptyStateProps {
  title: string;
  description: string;
  /** Folder new documents are created in; omit to hide the create buttons. */
  folderId?: string;
}

export function EmptyState({ title, description, folderId }: EmptyStateProps) {
  const { user } = useStore($auth);
  const { create, creating } = useCreateFile();

  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <PaperSheet className="mb-6 w-28" />
      <h3 className="font-serif text-lg font-medium tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-balance text-muted-foreground">{description}</p>
      {folderId !== undefined && (
        <div className="mt-5 flex items-center gap-2">
          <Button onClick={() => create("doc", folderId)} disabled={creating || !user}>
            {creating && <Loader2 className="animate-spin" />}
            Start a document
          </Button>
          <Button variant="outline" asChild>
            <Link href={templatesHref(folderId || user?.id || "")}>Pick a template</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
