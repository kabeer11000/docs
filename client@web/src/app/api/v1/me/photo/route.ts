import { ApiError } from "@/lib/api/errors";
import { isValidPhoto, profiles } from "@/lib/api/profiles";
import { authenticate, json, route } from "@/lib/api/server";

/** Set your profile photo (a small data URL made in the browser). */
export const PUT = route(async (request) => {
  const caller = await authenticate(request, { jwtOnly: true });
  const body = (await request.json().catch(() => null)) as { photo?: unknown } | null;
  if (!isValidPhoto(body?.photo)) throw new ApiError("validation_failed", "photo must be a webp, jpeg or png data URL under 120 KB");
  await (await profiles()).updateOne(
    { userId: caller.id },
    { $set: { photo: body.photo, updatedAt: new Date().toISOString() } },
    { upsert: true },
  );
  return json({ ok: true });
});

export const DELETE = route(async (request) => {
  const caller = await authenticate(request, { jwtOnly: true });
  await (await profiles()).updateOne({ userId: caller.id }, { $set: { photo: null, updatedAt: new Date().toISOString() } }, { upsert: true });
  return json({ ok: true });
});
