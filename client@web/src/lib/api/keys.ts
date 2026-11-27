import { createHash, randomBytes } from "node:crypto";

// Personal API keys: "kd_live_" + 32 random bytes (base64url, 43 chars). Only the sha256 hash is stored.
export const API_KEY_PREFIX = "kd_live_";
const KEY_PATTERN = /^kd_live_[A-Za-z0-9_-]{43}$/;

export const isApiKey = (token: string) => KEY_PATTERN.test(token);

export function generateApiKey(): string {
  return API_KEY_PREFIX + randomBytes(32).toString("base64url");
}

export const hashApiKey = (key: string) => createHash("sha256").update(key).digest("hex");

/** First 12 chars ("kd_live_" + 4), safe to show so users can tell keys apart. */
export const keyDisplayPrefix = (key: string) => key.slice(0, 12);

/** Token from an "Authorization: Bearer <token>" header, or null. */
export function bearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(\S+)\s*$/i);
  return match ? match[1] : null;
}
