/** Pure helpers behind UserAvatar and the photo picker. No DOM, so they are unit-tested. */

/** Old builds stored stock pictures at /avatars/avatar-N.png as a stand-in photo; they are not the user. */
const PLACEHOLDER = /^\/avatars\/avatar-[^/]*$/i;

export function isRealPhoto(url?: string | null): url is string {
  if (!url) return false;
  const value = url.trim();
  if (!value || PLACEHOLDER.test(value)) return false;
  return /^(https?:\/\/|data:image\/|blob:|\/)/i.test(value);
}

const firstChar = (word: string) => Array.from(word)[0] ?? "";

/** Up to two letters: first and last word of the name, else the parts of the email's local part. */
export function initials(name?: string | null, email?: string | null): string {
  const trimmed = name?.trim();
  // Display names often fall back to the email; read those as emails.
  const source = trimmed && !trimmed.includes("@") ? trimmed : undefined;
  const words = source
    ? source.split(/\s+/)
    : ((trimmed || email)?.split("@")[0] ?? "").split(/[._\-+\s]+/);
  const parts = words
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (parts.length === 0) return "?";
  const first = firstChar(parts[0]);
  const last = parts.length > 1 ? firstChar(parts[parts.length - 1]) : "";
  return (first + last).toLocaleUpperCase();
}

/** Hues picked to stay soft and distinct next to each other; the tint itself comes from theme tokens. */
export const AVATAR_HUES = [
  8, 28, 45, 85, 140, 165, 190, 210, 232, 262, 292, 330,
] as const;

/** FNV-1a, so the same person gets the same colour on every device. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function avatarHue(seed?: string | null): number {
  const key = seed?.trim().toLowerCase();
  if (!key) return AVATAR_HUES[0];
  return AVATAR_HUES[hashString(key) % AVATAR_HUES.length];
}

/** Largest centred square inside a w x h image. */
export function squareCrop(width: number, height: number) {
  const size = Math.max(0, Math.min(width, height));
  return { sx: (width - size) / 2, sy: (height - size) / 2, size };
}

/** Output edge for a crop: never upscale, never past max. */
export const outputSize = (cropSize: number, max = 256) =>
  Math.max(1, Math.min(Math.round(cropSize), max));

/** Decoded byte size of a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}
