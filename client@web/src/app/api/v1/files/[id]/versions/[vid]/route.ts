import { canRead } from "@/lib/api/permissions";
import { ApiError } from "@/lib/api/errors";
import { authenticate, json, loadFile, route } from "@/lib/api/server";
import { versions } from "@/lib/api/versions";

/** One version with its body. Restoring is done by the editor so live collaborators get it too. */
export const GET = route<{ id: string; vid: string }>(async (request, { id, vid }) => {
  const caller = await authenticate(request);
  const { access } = await loadFile(id, caller);
  if (!canRead(access)) throw new ApiError("forbidden", "No access");
  const v = await (await versions()).findOne({ fileId: id, id: vid }, { projection: { _id: 0 } });
  if (!v) throw new ApiError("not_found", "Version not found");
  return json({ version: v });
});
