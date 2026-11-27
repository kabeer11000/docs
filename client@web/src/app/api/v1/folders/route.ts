import { newFolder, serializeFolder } from "@/lib/api/documents";
import { assertOwnFolder, authenticate, folders, json, route } from "@/lib/api/server";
import { createFolderSchema, parseBody } from "@/lib/api/validation";

export const GET = route(async (request) => {
  const caller = await authenticate(request);
  const parent = new URL(request.url).searchParams.get("parent");
  const rows = await (await folders())
    .find({ "permissions.owner": caller.id, ...(parent ? { parents: parent } : {}) }, { projection: { _id: 0 } })
    .sort({ name: 1 })
    .limit(1000)
    .toArray();
  return json({ folders: rows.map(serializeFolder) });
});

export const POST = route(async (request) => {
  const caller = await authenticate(request);
  const body = await parseBody(request, createFolderSchema);
  const parent = body.parentId ?? caller.id;
  await assertOwnFolder(parent, caller);
  const folder = newFolder(caller, { name: body.name, parent });
  await (await folders()).insertOne({ ...folder });
  return json(serializeFolder(folder), 201);
});
