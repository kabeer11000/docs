"use client";

import type { Document } from "@shared-types";
import { Check, Copy, Globe } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getAuthHeader } from "@/lib/auth/manager";
import { showToast } from "@/lib/toast";

/** Publish to the web: a public, server-rendered read-only copy at /p/:id. Owner only. */
export function PublishSection({ document, isOwner }: { document: Document; isOwner: boolean }) {
  const [published, setPublished] = useState(!!document.published);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? `/p/${document.id}` : `${window.location.origin}/p/${document.id}`;

  const toggle = async (next: boolean) => {
    const auth = getAuthHeader();
    if (!auth) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/v1/files/${document.id}/publish`, { method: next ? "POST" : "DELETE", headers: { Authorization: auth } });
      if (!r.ok) throw new Error(String(r.status));
      setPublished(next);
      showToast.success(next ? "Published to the web" : "Unpublished");
    } catch {
      showToast.error("Could not change publishing", "Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-[12px] border border-border p-3">
      <div className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-[10px] bg-app-soft text-app">
          <Globe className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Publish to the web</p>
          <p className="text-xs text-muted-foreground">
            {published
              ? "Anyone with the link can read it. Changes appear within a minute."
              : "Share a fast, read-only page anyone can open."}
          </p>
        </div>
        <Switch checked={published} onCheckedChange={toggle} disabled={!isOwner || busy} aria-label="Publish to the web" />
      </div>
      {published && (
        <div className="mt-3 flex items-center gap-2">
          <input
            readOnly
            value={url}
            className="h-8 min-w-0 flex-1 rounded-[8px] border border-border bg-muted px-2 text-xs text-muted-foreground"
            aria-label="Published link"
          />
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              Open
            </a>
          </Button>
        </div>
      )}
      {!isOwner && <p className="mt-2 text-xs text-muted-foreground">Only the owner can change publishing.</p>}
    </div>
  );
}
