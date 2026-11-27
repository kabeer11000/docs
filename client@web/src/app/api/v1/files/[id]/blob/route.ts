import { blobShaOf, getPdfBlob, putPdfBlob, readBody } from "@/lib/api/blobs";
import { ApiError } from "@/lib/api/errors";
import { canWrite } from "@/lib/api/permissions";
import { authenticate, json, loadFile, route } from "@/lib/api/server";

type Params = { id: string };

/**
 * Stores the bytes of a PDF file (owners and editors). Body: the raw PDF, up to 15 MB.
 * Returns { sha256, size }; the client then points the row's data.blob at it.
 */
export const PUT = route<Params>(async (request, { id }) => {
  const caller = await authenticate(request);
  const { doc, access } = await loadFile(id, caller);
  if (!canWrite(access))
    throw new ApiError("forbidden", "You need edit access to change this file");
  if ((doc as { kind?: string }).kind !== "pdf")
    throw new ApiError("validation_failed", "Only PDF files have bytes");
  const stored = await putPdfBlob(await readBody(request), caller.id);
  return json(stored, 201);
});

/** The PDF bytes the file currently points at (anyone who can open the file). `?v=<sha256>` makes the response immutable. */
export const GET = route<Params>(async (request, { id }) => {
  const caller = await authenticate(request);
  const { doc } = await loadFile(id, caller);
  const sha = blobShaOf(doc as { kind?: string; data?: unknown });
  if (!sha) throw new ApiError("not_found", "This file has no PDF");
  const bytes = await getPdfBlob(sha);
  if (!bytes)
    throw new ApiError("not_found", "The PDF for this file is missing");
  const pinned = new URL(request.url).searchParams.get("v") === sha;
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.length),
      ETag: `"${sha}"`,
      "Cache-Control": pinned
        ? "private, max-age=31536000, immutable"
        : "private, no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
