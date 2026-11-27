import { ApiError } from "@/lib/api/errors";
import { isOwner } from "@/lib/api/permissions";
import { authenticate, documents, json, loadFile, route } from "@/lib/api/server";

// Publish to the web: anyone with the link can read a server-rendered copy at /p/:id.
export const POST = route<{ id: string }>(async (request, { id }) => {
  const caller = await authenticate(request);
  const { access } = await loadFile(id, caller);
  if (!isOwner(access)) throw new ApiError("forbidden", "Only the owner can publish this file");
  const at = new Date().toISOString();
  await (await documents()).updateOne({ id }, { $set: { published: { at } } });
  return json({ published: true, at, url: `/p/${id}` });
});

export const DELETE = route<{ id: string }>(async (request, { id }) => {
  const caller = await authenticate(request);
  const { access } = await loadFile(id, caller);
  if (!isOwner(access)) throw new ApiError("forbidden", "Only the owner can unpublish this file");
  await (await documents()).updateOne({ id }, { $unset: { published: "" } });
  return json({ published: false });
});
