"use client";

import { get, set } from "idb-keyval";
import { useEffect, useMemo, useRef, useState } from "react";
import { PaperSheet } from "@/components/home/paper-sheet";
import { fetchPdfBytes, openPdf, renderPage } from "@/lib/pdf/client";
import { parsePdfData, type Rotation } from "@/lib/pdf/model";

const WIDTH = 360; // CSS pixels of the cached image

// Rendered first pages by content address. Memory first, then IndexedDB, then pdf.js.
const memory = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

// ponytail: at most two PDFs download at once so a Home full of PDFs does not saturate the network.
let running = 0;
const waiting: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= 2) await new Promise<void>((r) => waiting.push(r));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

async function render(
  fileId: string,
  sha: string,
  src: number,
  rotation: Rotation,
): Promise<string | null> {
  const bytes = await fetchPdfBytes(fileId, sha);
  const pdf = await openPdf(bytes);
  try {
    const page = await pdf.getPage(src + 1);
    const base = page.getViewport({
      scale: 1,
      rotation: (page.rotate + rotation) % 360,
    });
    const canvas = document.createElement("canvas");
    await renderPage(
      page,
      canvas,
      WIDTH / base.width / (window.devicePixelRatio || 1),
      rotation,
    ).task.promise;
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    void pdf.destroy();
  }
}

function thumbnail(
  key: string,
  fileId: string,
  sha: string,
  src: number,
  rotation: Rotation,
): Promise<string | null> {
  const hit = memory.get(key);
  if (hit) return Promise.resolve(hit);
  let p = inflight.get(key);
  if (!p) {
    p = (async () => {
      const stored = await get<string>(key).catch(() => undefined);
      const url =
        stored ?? (await slot(() => render(fileId, sha, src, rotation)));
      if (url) {
        memory.set(key, url);
        if (!stored) void set(key, url).catch(() => {});
      }
      return url;
    })()
      .catch((e) => {
        console.warn("[pdf] thumbnail", e);
        return null;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

/** Home card preview: the PDF's first page (in its edited order and rotation), drawn once it is in view. */
export function PdfThumbnail({
  data,
  fileId,
}: {
  data: unknown;
  fileId: string;
}) {
  const model = useMemo(() => parsePdfData(data), [data]);
  const first = model?.pages[0];
  const key =
    model?.blob && first && first.src >= 0
      ? `pdf-thumb:${model.blob.sha256}:${first.src}:${first.rotation}`
      : null;
  const [url, setUrl] = useState<string | null>(() =>
    key ? (memory.get(key) ?? null) : null,
  );
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUrl(key ? (memory.get(key) ?? null) : null);
    const el = box.current;
    if (!key || !el || !model?.blob || !first || memory.has(key)) return;
    let live = true;
    const sha = model.blob.sha256;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        void thumbnail(key, fileId, sha, first.src, first.rotation).then(
          (u) => live && setUrl(u),
        );
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      live = false;
      io.disconnect();
    };
  }, [key, fileId, model, first]);

  return (
    <div ref={box}>
      <PaperSheet>
        {url && (
          // biome-ignore lint/performance/noImgElement: a cached data URL, nothing for next/image to optimise
          <img
            src={url}
            alt=""
            className="absolute inset-0 size-full object-cover object-top"
            draggable={false}
          />
        )}
      </PaperSheet>
    </div>
  );
}
