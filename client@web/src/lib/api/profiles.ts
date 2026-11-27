import { db } from "./server";

export interface ProfileRecord {
  userId: string;
  photo: string | null;
  updatedAt: string;
}

/** 256px WebP/JPEG from the client is ~20-60 KB; anything bigger is refused. */
export const MAX_PHOTO_CHARS = 120_000;
const PHOTO_RE = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;

export const isValidPhoto = (v: unknown): v is string => typeof v === "string" && v.length <= MAX_PHOTO_CHARS && PHOTO_RE.test(v);

export function decodePhoto(dataUrl: string): { type: string; bytes: Buffer } {
  const [head, b64] = dataUrl.split(",", 2);
  return { type: head.slice(5, head.indexOf(";")), bytes: Buffer.from(b64, "base64") };
}

export const profiles = async () => (await db()).collection<ProfileRecord>("profiles");
