import { atom } from "nanostores";

/**
 * Profile photos. The server copy (profiles collection, served at /api/avatar/:id) is what other
 * people and other devices see; this local copy makes your own change show instantly.
 * Kept out of the user object on purpose: it would overflow the user cookie and get copied
 * into every comment's author.
 */
export const $localPhotos = atom<Record<string, string | null>>({});

const key = (userId: string) => `docs:photo:${userId}`;

export function loadLocalPhoto(userId: string): string | null {
  const known = $localPhotos.get();
  if (userId in known) return known[userId];
  let value: string | null = null;
  try {
    value = localStorage.getItem(key(userId));
  } catch {
    /* storage blocked */
  }
  $localPhotos.set({ ...$localPhotos.get(), [userId]: value });
  return value;
}

/** Bumped when the signed-in user's photo changes, to refetch /api/avatar for them. */
export const $photoVersion = atom(0);

/** Saves on the server (so it follows you) and locally (so it shows at once). Throws if the server refuses. */
export async function saveLocalPhoto(userId: string, dataUrl: string | null, authHeader: string | null): Promise<void> {
  if (!authHeader) throw new Error("signed out");
  const r = await fetch("/api/v1/me/photo", {
    method: dataUrl ? "PUT" : "DELETE",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: dataUrl ? JSON.stringify({ photo: dataUrl }) : undefined,
  });
  if (!r.ok) throw new Error(`photo save failed: ${r.status}`);
  try {
    if (dataUrl) localStorage.setItem(key(userId), dataUrl);
    else localStorage.removeItem(key(userId));
  } catch {
    /* local copy is only a speed-up */
  }
  $localPhotos.set({ ...$localPhotos.get(), [userId]: dataUrl });
  $photoVersion.set($photoVersion.get() + 1);
}
