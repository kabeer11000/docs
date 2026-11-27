"use client";

import { useStore } from "@nanostores/react";
import { formatDistanceToNow } from "date-fns";
import { History, Loader2 } from "lucide-react";
import { atom } from "nanostores";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getAuthHeader } from "@/lib/auth/manager";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { editorInstance } from "@/state/editor";

export const $versionsOpen = atom(false);

type VersionMeta = { id: string; at: string; title: string; size: number };

const api = async (path: string, init?: RequestInit) => {
  const auth = getAuthHeader();
  if (!auth) throw new Error("signed out");
  const r = await fetch(`/api/v1${path}`, { ...init, headers: { Authorization: auth, ...(init?.headers || {}) } });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
};

/** Side panel listing snapshots; preview one, restore it through the editor so live collaborators get it too. */
export function VersionHistory({ documentId, canEdit }: { documentId: string; canEdit: boolean }) {
  const open = useStore($versionsOpen);
  const [list, setList] = useState<VersionMeta[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setList(null);
    try {
      const { versions } = await api(`/files/${documentId}/versions`);
      setList(versions);
    } catch {
      setList([]);
    }
  }, [documentId]);

  useEffect(() => {
    if (open) load();
    else {
      setSelected(null);
      setPreview(null);
    }
  }, [open, load]);

  const pick = async (id: string) => {
    setSelected(id);
    setPreview(null);
    try {
      const { version } = await api(`/files/${documentId}/versions/${id}`);
      const html = typeof version.content === "string" ? version.content : "";
      // Loaded on demand: the import module pulls in the markdown toolchain.
      const { sanitizeHtml } = await import("@/lib/export/import");
      setPreview(sanitizeHtml(html, (h) => new DOMParser().parseFromString(h, "text/html")));
    } catch {
      setPreview("");
    }
  };

  const saveNow = async () => {
    setBusy(true);
    try {
      await api(`/files/${documentId}/versions?force=1`, { method: "POST" });
      showToast.success("Version saved");
      await load();
    } catch {
      showToast.error("Could not save a version");
    } finally {
      setBusy(false);
    }
  };

  const restore = () => {
    const editor = editorInstance.get();
    if (!editor || preview === null) return;
    // A normal, undoable edit: autosave stores it and the live room shares it.
    editor.chain().focus().setContent(preview, { emitUpdate: true }).run();
    $versionsOpen.set(false);
    showToast.success("Version restored", "Undo with Ctrl+Z if you change your mind.");
  };

  return (
    <Sheet open={open} onOpenChange={$versionsOpen.set}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[560px]">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 font-display text-lg">
            <History className="size-4 text-app" />
            Version history
          </SheetTitle>
        </SheetHeader>
        <div className="grid min-h-0 flex-1 grid-cols-[200px_1fr]">
          <div className="overflow-y-auto border-r border-border p-2">
            {canEdit && (
              <Button size="sm" variant="outline" className="mb-2 w-full" onClick={saveNow} disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                Save a version now
              </Button>
            )}
            {list === null && <p className="px-2 py-3 text-xs text-muted-foreground">Loading...</p>}
            {list?.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                Versions are saved automatically while you edit, at most every 10 minutes.
              </p>
            )}
            {list?.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => pick(v.id)}
                className={cn(
                  "press mb-0.5 w-full rounded-[10px] px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-accent",
                  selected === v.id && "bg-app-soft text-foreground",
                )}
              >
                <span className="block font-medium">{new Date(v.at).toLocaleString()}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(v.at), { addSuffix: true })}
                </span>
              </button>
            ))}
          </div>
          <div className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto bg-background p-4">
              {selected === null ? (
                <p className="text-sm text-muted-foreground">Pick a version to preview it.</p>
              ) : preview === null ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <div
                  className="ProseMirror paged pointer-events-none rounded-[6px] bg-paper p-6 text-[13px] shadow-card"
                  // Sanitized on load (scripts, handlers and unsafe URLs removed).
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized snapshot preview
                  dangerouslySetInnerHTML={{ __html: preview }}
                />
              )}
            </div>
            {canEdit && selected && preview !== null && (
              <div className="flex justify-end border-t border-border px-4 py-3">
                <Button variant="app" onClick={restore}>
                  Restore this version
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
