import { canRead, canWrite } from "@/lib/api/permissions";
import { ApiError } from "@/lib/api/errors";
import { authenticate, json, loadFile, route } from "@/lib/api/server";
import { snapshot, versions } from "@/lib/api/versions";

/** Version list (newest first, without bodies). */
export const GET = route<{ id: string }>(async (request, { id }) => {
  const caller = await authenticate(request);
  const { access } = await loadFile(id, caller);
  if (!canRead(access)) throw new ApiError("forbidden", "No access");
  const list = await (await versions())
    .find({ fileId: id }, { projection: { _id: 0, content: 0, data: 0 } })
    .sort({ at: -1 })
    .toArray();
  return json({ versions: list });
});

/** Take a snapshot of the stored file. `?force=1` skips the 10-minute throttle (named checkpoints). */
export const POST = route<{ id: string }>(async (request, { id }) => {
  const caller = await authenticate(request);
  const { doc, access } = await loadFile(id, caller);
  if (!canWrite(access)) throw new ApiError("forbidden", "Only editors can save versions");
  const force = new URL(request.url).searchParams.get("force") === "1";
  const v = await snapshot(doc, caller.id, force);
  return json({ created: !!v, version: v ? { id: v.id, at: v.at } : null });
});
