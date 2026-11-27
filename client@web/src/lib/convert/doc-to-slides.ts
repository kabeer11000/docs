import type { Document } from "@shared-types";
import { createFile } from "@/hooks/use-cloudstore";
import { docHtml } from "@/lib/api/content";
import cloudStore from "@/lib/cloudstore";
import { normalizeDeck } from "@/lib/slides/model";
import { $auth } from "@/state/auth";
import { $documents, $documentsLive } from "@/state/cloudstore-data";
import { docHtmlToSlides } from "./split";

async function findDocument(id: string): Promise<Document | null> {
  // Rows restored from the IndexedDB cache may be stale; only trust the live list.
  const listed = $documentsLive.get() ? $documents.get().find((d) => d.id === id) : undefined;
  if (listed) return listed;
  const found = (await cloudStore
    .collection("documents")
    .get(cloudStore.query.where("id", "EQUAL", id))) as Document[];
  return found[0] ?? null;
}

// CONTRACT (owned by the import agent): turn a document's HTML into a new presentation
// (H1/H2 become slides) and return the new file id.
export async function convertDocToSlides(
  documentId: string,
): Promise<string | null> {
  const user = $auth.get().user;
  if (!user) return null;
  const source = await findDocument(documentId);
  if (!source) return null;
  const html = docHtml(source.pages?.[0]?.content) ?? "";
  const deck = normalizeDeck({
    slides: docHtmlToSlides(html, source.title || "Untitled presentation"),
  });

  return createFile(user, {
    kind: "slides",
    data: deck,
    title: source.title || "Untitled presentation",
    // Next to the source only when it is in the user's own space.
    folderId: source.owner === user.id ? source.location : undefined,
  });
}
