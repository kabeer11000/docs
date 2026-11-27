import { decodePhoto, profiles } from "@/lib/api/profiles";

// Public on purpose: collaborators' avatars appear in shared files. Short cache so changes show soon.
export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const rec = /^[\w-]{1,64}$/.test(userId) ? await (await profiles()).findOne({ userId }, { projection: { photo: 1 } }) : null;
  if (!rec?.photo) return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=300" } });
  const { type, bytes } = decodePhoto(rec.photo);
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=300, stale-while-revalidate=86400", "X-Content-Type-Options": "nosniff" },
  });
}
