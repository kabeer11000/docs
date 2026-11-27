// Server-only: PDF bytes, kept out of the documents rows (rows are shipped to every client's file list).
// Content-addressed by sha256, so "Make a copy" (which copies the row) shares the bytes for free and an
// unchanged upload is stored once. The row's data.blob.sha256 is the only way a reader reaches a blob.
import { createHash } from "node:crypto";
import { Binary } from "mongodb";
import { isPdfBytes, MAX_PDF_BYTES } from "@/lib/pdf/model";
import { ApiError } from "./errors";
import { db } from "./server";

interface BlobRecord {
  _id: string; // sha256, hex
  data: Binary;
  size: number;
  sha256: string;
  contentType: "application/pdf";
  createdBy: string;
  createdAt: Date;
}

const blobs = async () => (await db()).collection<BlobRecord>("blobs");

export const sha256Hex = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

/** Reads a request body up to `limit` bytes; larger bodies are refused without buffering them. */
export async function readBody(
  request: Request,
  limit = MAX_PDF_BYTES,
): Promise<Uint8Array> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > limit)
    throw new ApiError(
      "payload_too_large",
      `Files up to ${limit / 1024 / 1024} MB are supported`,
    );
  if (!request.body)
    throw new ApiError("bad_request", "The request has no body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel().catch(() => {});
      throw new ApiError(
        "payload_too_large",
        `Files up to ${limit / 1024 / 1024} MB are supported`,
      );
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** Stores PDF bytes (once per content) and returns their address. */
export async function putPdfBlob(
  bytes: Uint8Array,
  userId: string,
): Promise<{ sha256: string; size: number }> {
  if (!bytes.length) throw new ApiError("bad_request", "The file is empty");
  if (bytes.length > MAX_PDF_BYTES)
    throw new ApiError("payload_too_large", "Files up to 15 MB are supported");
  if (!isPdfBytes(bytes))
    throw new ApiError("validation_failed", "This is not a PDF file");
  const sha256 = sha256Hex(bytes);
  await (await blobs()).updateOne(
    { _id: sha256 },
    {
      $setOnInsert: {
        data: new Binary(bytes),
        size: bytes.length,
        sha256,
        contentType: "application/pdf",
        createdBy: userId,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
  return { sha256, size: bytes.length };
}

export async function getPdfBlob(sha256: string): Promise<Uint8Array | null> {
  const record = await (await blobs()).findOne(
    { _id: sha256 },
    { projection: { data: 1 } },
  );
  return record ? record.data.value() : null;
}

/** The blob address a file row points at, if it is a PDF with bytes. */
export function blobShaOf(doc: {
  kind?: string;
  data?: unknown;
}): string | null {
  if (doc.kind !== "pdf") return null;
  const sha = (doc.data as { blob?: { sha256?: unknown } } | null)?.blob
    ?.sha256;
  return typeof sha === "string" && /^[0-9a-f]{64}$/.test(sha) ? sha : null;
}
