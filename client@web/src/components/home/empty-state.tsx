import { useStore } from "@nanostores/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { showToast } from "@/lib/toast";
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
  const { createDocument } = useCloudStore();
  const [isCreating, setIsCreating] = useState(false);

  // Same path as the "Blank" tile on the templates page.
  const handleNewDocument = async () => {
    if (!user || isCreating) return;
    setIsCreating(true);
    try {
      const docId = await createDocument({ folderId: folderId || user.id });
      if (docId) {
        window.location.href = `/document/${docId}`;
        return;
      }
      showToast.error("Failed to create document", "Please try again");
    } catch (error) {
      console.error("Failed to create document:", error);
      showToast.error("Failed to create document", "Please try again");
    }
    setIsCreating(false);
  };

  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <PaperSheet className="mb-6 w-28" />
      <h3 className="font-serif text-lg font-medium tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-balance text-muted-foreground">{description}</p>
      {folderId !== undefined && (
        <div className="mt-5 flex items-center gap-2">
          <Button onClick={handleNewDocument} disabled={isCreating || !user}>
            {isCreating && <Loader2 className="animate-spin" />}
            Start a document
          </Button>
          <Button variant="outline" asChild>
            <a href={templatesHref(folderId || user?.id || "")}>Pick a template</a>
          </Button>
        </div>
      )}
    </div>
  );
}
