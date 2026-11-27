import { nanoid } from "nanoid";
import { ApiError } from "@/lib/api/errors";
import { generateApiKey, hashApiKey, keyDisplayPrefix } from "@/lib/api/keys";
import { type ApiKeyRecord, apiKeys, authenticate, json, publicKey, route } from "@/lib/api/server";
import { createKeySchema, parseBody } from "@/lib/api/validation";

const MAX_ACTIVE_KEYS = 25;

export const GET = route(async (request) => {
  const caller = await authenticate(request, { jwtOnly: true });
  const keys = await (await apiKeys()).find({ userId: caller.id, revokedAt: null }).sort({ createdAt: -1 }).toArray();
  return json({ keys: keys.map(publicKey) });
});

export const POST = route(async (request) => {
  const caller = await authenticate(request, { jwtOnly: true });
  const { name } = await parseBody(request, createKeySchema);
  const keys = await apiKeys();
  if ((await keys.countDocuments({ userId: caller.id, revokedAt: null })) >= MAX_ACTIVE_KEYS) {
    throw new ApiError("validation_failed", `You can have at most ${MAX_ACTIVE_KEYS} active keys; revoke one first`);
  }
  const raw = generateApiKey();
  const record: ApiKeyRecord = {
    id: nanoid(),
    userId: caller.id,
    email: caller.email,
    name,
    prefix: keyDisplayPrefix(raw),
    hash: hashApiKey(raw),
    createdAt: new Date(),
    lastUsedAt: null,
    revokedAt: null,
  };
  await keys.insertOne({ ...record });
  // The raw key is returned once and never stored.
  return json({ ...publicKey(record), key: raw }, 201);
});
