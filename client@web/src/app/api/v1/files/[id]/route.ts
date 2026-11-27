import { toStoredHtml, wordCount } from "@/lib/api/content";
import { fileKind, serializeFile } from "@/lib/api/documents";
import { ApiError } from "@/lib/api/errors";
import { canWrite, isOwner } from "@/lib/api/permissions";
import { authenticate, documents, json, loadFile, route } from "@/lib/api/server";
import { parseBody, updateFileSchema } from "@/lib/api/validation";

type Params = { id: string };

export const GET = route<Params>(async (request, { id }) => {
  const caller = await authenticate(request);
  const { doc, access } = await loadFile(id, caller);
  return json(serializeFile(doc, access, true));
});

export const PATCH = route<Params>(async (request, { id }) => {
  const caller = await authenticate(request);
  const { doc, access } = await loadFile(id, caller);
  if (!canWrite(access)) throw new ApiError("forbidden", "You need edit access to change this file");
  const body = await parseBody(request, updateFileSchema);
  const kind = fileKind(doc);

  const set: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.title !== undefined) {
    if (!isOwner(access)) throw new ApiError("forbidden", "Only the owner can rename this file");
    set.title = body.title;
  }
  if (body.content !== undefined) {
    if (kind !== "doc") throw new ApiError("validation_failed", "content is only for docs; use data for sheets and slides");
    const html = toStoredHtml(body.content, body.format);
    set.pages = [{ ...doc.pages[0], content: html }];
    set.wordCount = wordCount(html);
  }
  if (body.data !== undefined) {
    if (kind === "doc") throw new ApiError("validation_failed", "data is only for sheets and slides; use content for docs");
    set.data = body.data;
  }

  await (await documents()).updateOne({ id }, { $set: set });
  return json(serializeFile({ ...doc, ...set }, access, true));
});

export const DELETE = route<Params>(async (request, { id }) => {
  const caller = await authenticate(request);
  const { access } = await loadFile(id, caller);
  if (!isOwner(access)) throw new ApiError("forbidden", "Only the owner can delete this file");
  // Hard delete, same as useCloudStore().deleteDocument.
  await (await documents()).deleteOne({ id });
  return new Response(null, { status: 204 });
});
