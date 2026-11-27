import { useStore } from "@nanostores/react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { type FileKind, fileHref } from "@/lib/files";
import { showToast } from "@/lib/toast";
import { $auth } from "@/state/auth";
import { useCloudStore } from "./use-cloudstore";

/** Creates a blank file of any kind and opens it. One path for the sidebar, palette, shortcuts and empty states. */
export function useCreateFile() {
  const router = useRouter();
  const { createDocument } = useCloudStore();
  const { user } = useStore($auth);
  const [creating, setCreating] = useState(false);
  const busy = useRef(false);

  const create = useCallback(
    async (kind: FileKind = "doc", folderId?: string) => {
      if (!user || busy.current) return;
      busy.current = true;
      setCreating(true);
      try {
        const id = await createDocument({ kind, folderId: folderId || user.id, initialContent: kind === "doc" ? "<p></p>" : undefined });
        if (!id) throw new Error("create failed");
        router.push(fileHref(id, kind));
      } catch {
        showToast.error("Could not create the file", "Check your connection and try again.");
      } finally {
        busy.current = false;
        setCreating(false);
      }
    },
    [user, createDocument, router],
  );

  return { create, creating, canCreate: !!user };
}
