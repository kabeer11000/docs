import { useStore } from "@nanostores/react";
import { nanoid } from "nanoid";
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
      // Open at once: the file is primed in the local store before the insert is sent, so the
      // editor renders immediately while the server catches up. If the insert fails, go back.
      const id = nanoid();
      const href = fileHref(id, kind);
      createDocument({ id, kind, folderId: folderId || user.id, initialContent: kind === "doc" ? "<p></p>" : undefined })
        .then((ok) => {
          if (!ok) throw new Error("create failed");
        })
        .catch(() => {
          showToast.error("Could not create the file", "Check your connection and try again.");
          if (window.location.pathname === href) router.replace("/home");
        });
      router.push(href);
      busy.current = false;
      setCreating(false);
    },
    [user, createDocument, router],
  );

  return { create, creating, canCreate: !!user };
}
