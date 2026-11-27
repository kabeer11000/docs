"use client";
import { useStore } from "@nanostores/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { fileHref } from "@/lib/files";
import { $documents } from "@/state/cloudstore-data";
import { useLiveDocument } from "../core/use-document-loader";
import { docLinkActions } from "./actions";
import { findBacklinks } from "./links";

const GAP = 16;

/** "Linked from" list under the outline rail; shares the outline's width and visibility. Mount right after <Outline />. */
export function LinkedFrom({ documentId }: { documentId: string }) {
  const router = useRouter();
  const { createDocument } = useCloudStore();
  const folderId = useLiveDocument(documentId).document?.location;
  const docs = useStore($documents);
  const backlinks = useMemo(() => findBacklinks(docs, documentId), [docs, documentId]);
  const anchor = useRef<HTMLDivElement>(null);
  const [rail, setRail] = useState<{ width: number; top: number } | null>(null);

  useEffect(() => {
    docLinkActions.currentId = documentId;
    docLinkActions.navigate = (href) => router.push(href);
    docLinkActions.create = async ({ id, title }) => !!(await createDocument({ id, title, folderId }));
  }, [documentId, router, createDocument, folderId]);

  // Follow the outline's rail: same width, placed below its list, hidden when it is.
  useEffect(() => {
    const host = anchor.current?.previousElementSibling;
    if (!host) return;
    const sync = () => {
      const nav = host.querySelector("nav");
      const next = nav ? { width: nav.offsetWidth, top: nav.offsetTop + nav.offsetHeight + GAP } : null;
      setRail((r) => (r?.width === next?.width && r?.top === next?.top ? r : next));
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(host, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", sync);
    return () => {
      mo.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  return (
    <div ref={anchor} className="sticky top-0 z-10 hidden h-0 lg:block">
      {rail && backlinks.length > 0 && (
        <nav
          aria-label="Linked from"
          style={{ width: rail.width, top: rail.top, maxHeight: `calc(100dvh - 10rem - ${rail.top}px)` }}
          className="absolute left-0 flex min-h-24 flex-col font-sans"
        >
          <div className="flex h-7 shrink-0 items-center pl-3">
            <span className="text-xs font-medium text-muted-foreground">Linked from</span>
          </div>
          <ul className="min-h-0 overflow-y-auto pb-2">
            {backlinks.map((b) => (
              <li key={b.id}>
                <Link
                  href={fileHref(b.id)}
                  title={b.title}
                  className="block rounded-md py-1 pr-2 pl-3 outline-none transition-colors duration-150 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40"
                >
                  <span className="block truncate font-serif text-[13px] text-primary">{b.title || "Untitled"}</span>
                  {b.excerpt && <span className="block truncate text-xs text-muted-foreground">{b.excerpt}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
