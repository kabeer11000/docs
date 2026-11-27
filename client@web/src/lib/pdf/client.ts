// Browser side of PDF files: pdf.js on demand, and the blob API (bytes live outside the documents row).
import type {
  PDFDocumentProxy,
  PDFPageProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import { getAuthHeader } from "@/lib/auth/manager";
import type { Rotation } from "./model";

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
let lib: Promise<PdfJs> | null = null;

/** pdf.js, loaded once on first use (same worker setup as the importer). */
export function pdfjs(): Promise<PdfJs> {
  lib ??= import("pdfjs-dist/legacy/build/pdf.mjs").then((m) => {
    if (!m.GlobalWorkerOptions.workerSrc) {
      m.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
    }
    return m;
  });
  return lib;
}

/** Opens bytes with pdf.js. The bytes are copied: the worker takes ownership of what it is given. */
export async function openPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const m = await pdfjs();
  return m.getDocument({
    data: bytes.slice(),
    isEvalSupported: false,
    enableXfa: false,
  }).promise;
}

function authHeader(): string {
  const auth = getAuthHeader();
  if (!auth) throw new Error("You are signed out. Sign in and try again.");
  return auth;
}

async function failure(r: Response): Promise<Error> {
  const body = (await r.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  return new Error(body?.error?.message || `Request failed (${r.status})`);
}

// ponytail: keeps the last few files' bytes in memory; the HTTP cache (immutable by sha) covers the rest.
const bytesCache = new Map<string, Promise<Uint8Array>>();
const remember = (sha: string, p: Promise<Uint8Array>) => {
  bytesCache.delete(sha);
  bytesCache.set(sha, p);
  while (bytesCache.size > 4)
    bytesCache.delete(bytesCache.keys().next().value as string);
  p.catch(() => bytesCache.delete(sha));
  return p;
};

/** The PDF bytes of a file at blob version `sha256`. */
export function fetchPdfBytes(
  fileId: string,
  sha256: string,
): Promise<Uint8Array> {
  const hit = bytesCache.get(sha256);
  if (hit) return hit;
  return remember(
    sha256,
    (async () => {
      const r = await fetch(
        `/api/v1/files/${encodeURIComponent(fileId)}/blob?v=${sha256}`,
        { headers: { Authorization: authHeader() } },
      );
      if (!r.ok) throw await failure(r);
      return new Uint8Array(await r.arrayBuffer());
    })(),
  );
}

/** Stores new bytes for a file; resolves with their address. Retries briefly while a new row reaches the server. */
export async function uploadPdfBytes(
  fileId: string,
  bytes: Uint8Array,
): Promise<{ sha256: string; size: number }> {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(`/api/v1/files/${encodeURIComponent(fileId)}/blob`, {
      method: "PUT",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/pdf",
      },
      body: bytes as BodyInit,
    });
    if (r.ok) {
      const stored = (await r.json()) as { sha256: string; size: number };
      remember(stored.sha256, Promise.resolve(bytes));
      return stored;
    }
    if (r.status !== 404 || attempt >= 4) throw await failure(r);
    await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
  }
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

/** Largest canvas we draw, in device pixels (keeps 400% zoom on big pages from exhausting memory). */
const MAX_PIXELS = 16_000_000;

/**
 * Renders `page` into `canvas` at `scale` CSS pixels per point with an extra clockwise `rotation`.
 * Returns the render task so callers can cancel it.
 */
export function renderPage(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number,
  rotation: Rotation,
  annotationMode?: number,
) {
  const viewport = page.getViewport({
    scale,
    rotation: (page.rotate + rotation) % 360,
  });
  let ratio = window.devicePixelRatio || 1;
  const pixels = viewport.width * viewport.height * ratio * ratio;
  if (pixels > MAX_PIXELS) ratio *= Math.sqrt(MAX_PIXELS / pixels);
  canvas.width = Math.max(1, Math.floor(viewport.width * ratio));
  canvas.height = Math.max(1, Math.floor(viewport.height * ratio));
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  const task = page.render({
    canvas,
    viewport,
    transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
    ...(annotationMode === undefined ? {} : { annotationMode }),
  });
  return { task, viewport };
}

export const isCancelled = (e: unknown) =>
  (e as { name?: string } | null)?.name === "RenderingCancelledException";
