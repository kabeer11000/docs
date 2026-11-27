import { docHtml, exportHtml } from "@/lib/api/content";
import { fileKind } from "@/lib/api/documents";
import { ApiError } from "@/lib/api/errors";
import { authenticate, loadFile, route } from "@/lib/api/server";
import { exportQuery, parseQuery } from "@/lib/api/validation";

const CONTENT_TYPE = { html: "text/html", markdown: "text/markdown", text: "text/plain" } as const;

export const GET = route<{ id: string }>(async (request, { id }) => {
  const caller = await authenticate(request);
  const { format } = parseQuery(exportQuery, request.url);
  const { doc } = await loadFile(id, caller);
  if (fileKind(doc) !== "doc") throw new ApiError("validation_failed", "Export is only available for docs");
  const html = docHtml(doc.pages?.[0]?.content);
  if (html === null) throw new ApiError("validation_failed", "This document has not been saved as HTML yet; open it in the editor once");
  return new Response(exportHtml(html, format), { headers: { "Content-Type": `${CONTENT_TYPE[format]}; charset=utf-8` } });
});
