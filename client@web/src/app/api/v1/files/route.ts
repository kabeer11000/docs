import type { Document } from "@shared-types";
import type { Filter } from "mongodb";
import { toStoredHtml, wordCount } from "@/lib/api/content";
import { kindFilter, newDocument, serializeFile, titleSearch } from "@/lib/api/documents";
import { accessFor, accessibleFilter } from "@/lib/api/permissions";
import { assertOwnFolder, authenticate, documents, json, route } from "@/lib/api/server";
import { createFileSchema, listFilesQuery, parseBody, parseQuery } from "@/lib/api/validation";

const LIST_PROJECTION = { _id: 0, pages: 0, data: 0, signatures: 0, signatureRequests: 0, pageSettings: 0 };

export const GET = route(async (request) => {
  const caller = await authenticate(request);
  const q = parseQuery(listFilesQuery, request.url);
  const and = [accessibleFilter(caller)] as Filter<Document>[];
  if (q.kind) and.push(kindFilter(q.kind) as Filter<Document>);
  if (q.folder) and.push({ parents: q.folder });
  if (q.q) and.push(titleSearch(q.q) as Filter<Document>);

  // ponytail: offset cursor; switch to a keyset cursor (updatedAt, id) if file lists get large.
  const offset = Number(q.cursor ?? 0);
  const rows = await (await documents())
    .find({ $and: and }, { projection: LIST_PROJECTION })
    .sort({ updatedAt: -1, id: 1 })
    .skip(offset)
    .limit(q.limit + 1)
    .toArray();
  const files = rows.slice(0, q.limit).flatMap((doc) => {
    const access = accessFor(doc, caller);
    return access ? [serializeFile(doc, access)] : [];
  });
  return json({ files, nextCursor: rows.length > q.limit ? String(offset + q.limit) : null });
});

export const POST = route(async (request) => {
  const caller = await authenticate(request);
  const body = await parseBody(request, createFileSchema);
  const parent = body.folderId ?? caller.id;
  await assertOwnFolder(parent, caller);
  const html = body.content !== undefined ? toStoredHtml(body.content, body.format) : undefined;
  const doc = newDocument(caller, {
    kind: body.kind,
    title: body.title,
    parent,
    html,
    wordCount: html ? wordCount(html) : 0,
    data: body.data,
  });
  await (await documents()).insertOne({ ...doc });
  return json(serializeFile(doc, "owner", true), 201);
});
