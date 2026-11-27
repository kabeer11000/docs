"use client";

import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { PageBody } from "@/components/home/page-body";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showToast } from "@/lib/toast";
import { getAuthHeader } from "@/state/auth";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: getAuthHeader() ?? "", ...init.headers },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  return body as T;
}

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Never";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ name: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);

  const load = useCallback(async () => {
    try {
      setKeys((await call<{ keys: ApiKey[] }>("/keys")).keys);
    } catch (e) {
      setKeys([]);
      showToast.error("Could not load API keys", (e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await call<ApiKey & { key: string }>("/keys", { method: "POST", body: JSON.stringify({ name: name.trim() }) });
      setCreated({ name: res.name, key: res.key });
      setCopied(false);
      setName("");
      await load();
    } catch (err) {
      showToast.error("Could not create key", (err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function copy() {
    if (!created) return;
    await navigator.clipboard.writeText(created.key);
    setCopied(true);
  }

  async function revoke(key: ApiKey) {
    try {
      await call(`/keys/${key.id}`, { method: "DELETE" });
      showToast.success("Key revoked");
      if (created && key.prefix === created.key.slice(0, 12)) setCreated(null);
      await load();
    } catch (err) {
      showToast.error("Could not revoke key", (err as Error).message);
    }
  }

  return (
    <PageBody title="API keys">
      <div className="max-w-2xl space-y-8">
        <p className="text-sm text-muted-foreground">
          Keys let scripts and other apps read and edit your files through the{" "}
          <Link href="/developers" className="text-primary hover:underline">
            API
          </Link>
          . A key can do anything you can, so keep it secret.
        </p>

        <form onSubmit={create} className="flex gap-2">
          <label htmlFor="key-name" className="sr-only">
            Key name
          </label>
          <Input
            id="key-name"
            placeholder="Key name, for example CI export"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            className="max-w-sm"
          />
          <Button type="submit" disabled={creating || !name.trim()}>
            {creating ? "Creating..." : "Create key"}
          </Button>
        </form>

        {created && (
          <div className="space-y-2 rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium">Copy your new key for {created.name}</p>
            <p className="text-[13px] text-muted-foreground">You will not be able to see it again.</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted/60 px-2.5 py-1.5 font-mono text-[12.5px]">
                {created.key}
              </code>
              <Button variant="outline" size="sm" onClick={copy}>
                {copied ? <Check /> : <Copy />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        )}

        <section className="space-y-2">
          <h2 className="text-xs font-medium text-muted-foreground">Active keys</h2>
          {keys === null ? (
            <div className="h-10 rounded-md bg-muted/70" aria-hidden="true" />
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No keys yet. Create one to start using the API.</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {keys.map((k) => (
                <li key={k.id} className="flex min-h-12 items-center gap-4 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{k.name}</p>
                    <p className="text-[13px] text-muted-foreground">
                      <span className="font-mono">{k.prefix}...</span>
                      <span className="ml-3">Created {formatDate(k.createdAt)}</span>
                      <span className="ml-3">Last used {formatDate(k.lastUsedAt)}</span>
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setRevoking(k)}>
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <AlertDialog open={!!revoking} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke {revoking?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Anything using this key stops working right away. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => revoking && revoke(revoking)}
            >
              Revoke key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageBody>
  );
}
