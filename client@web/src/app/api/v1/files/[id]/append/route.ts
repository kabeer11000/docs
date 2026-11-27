import { appendHtml, docHtml, toStoredHtml, wordCount } from "@/lib/api/content";
import { fileKind, serializeFile } from "@/lib/api/documents";
import { ApiError } from "@/lib/api/errors";
import { canWrite } from "@/lib/api/permissions";
import { authenticate, documents, json, loadFile, route } from "@/lib/api/server";
import { appendSchema, parseBody } from "@/lib/api/validation";

export const POST = route<{ id: string }>(async (request, { id }) => {
  const caller = await authenticate(request);
  const { doc, access } = await loadFile(id, caller);
  if (!canWrite(access)) throw new ApiError("forbidden", "You need edit access to change this file");
  if (fileKind(doc) !== "doc") throw new ApiError("validation_failed", "Append is only available for docs");
  const body = await parseBody(request, appendSchema);
  const current = docHtml(doc.pages?.[0]?.content);
  if (current === null) throw new ApiError("validation_failed", "This document has not been saved as HTML yet; open it in the editor once");

  const added = body.markdown !== undefined ? toStoredHtml(body.markdown, "markdown") : toStoredHtml(body.html ?? "", "html");
  const html = appendHtml(current, added);
  // ponytail: read-modify-write without a version check; concurrent appends can drop one. Add an updatedAt guard if that bites.
  const set = { pages: [{ ...doc.pages[0], content: html }], wordCount: wordCount(html), updatedAt: new Date().toISOString() };
  await (await documents()).updateOne({ id }, { $set: set });
  return json(serializeFile({ ...doc, ...set }, access));
});
