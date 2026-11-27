import { ApiError } from "@/lib/api/errors";
import { apiKeys, authenticate, route } from "@/lib/api/server";

export const DELETE = route<{ id: string }>(async (request, { id }) => {
  const caller = await authenticate(request, { jwtOnly: true });
  const res = await (await apiKeys()).updateOne({ id, userId: caller.id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  if (res.matchedCount === 0) throw new ApiError("not_found", "Key not found");
  return new Response(null, { status: 204 });
});
