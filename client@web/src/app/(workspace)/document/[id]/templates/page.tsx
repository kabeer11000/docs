import { redirect } from "next/navigation";
import { templatesHref } from "@/components/templates/links";

// Old entry point; the unified gallery lives at /templates.
export default async function DocumentTemplatesPage({ searchParams }: { searchParams: Promise<{ folderId?: string }> }) {
  const { folderId } = await searchParams;
  redirect(templatesHref("doc", folderId));
}
