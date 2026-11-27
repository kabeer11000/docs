import { z } from "zod";
import { ApiError } from "./errors";

export const MAX_BODY_BYTES = 2 * 1024 * 1024;

const kind = z.enum(["doc", "sheet", "slides"]);
const title = z.string().trim().min(1).max(500);
const format = z.enum(["html", "markdown"]).default("html");
const id = z.string().trim().min(1).max(200);

export const createFileSchema = z
  .object({
    kind: kind.default("doc"),
    title: title.optional(),
    folderId: id.optional(),
    content: z.string().optional(),
    format,
    data: z.unknown().optional(),
  })
  .strict()
  .refine((b) => b.kind === "doc" || b.content === undefined, { message: "content is only for docs; use data for sheets and slides", path: ["content"] })
  .refine((b) => b.kind !== "doc" || b.data === undefined, { message: "data is only for sheets and slides; use content for docs", path: ["data"] });

export const updateFileSchema = z
  .object({ title: title.optional(), content: z.string().optional(), format, data: z.unknown().optional() })
  .strict()
  .refine((b) => b.title !== undefined || b.content !== undefined || b.data !== undefined, { message: "Provide title, content or data" });

export const appendSchema = z
  .object({ html: z.string().optional(), markdown: z.string().optional() })
  .strict()
  .refine((b) => (b.html === undefined) !== (b.markdown === undefined), { message: "Provide exactly one of html or markdown" });

const cell = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const putCellsSchema = z
  .object({
    sheet: z.string().min(1).optional(),
    range: z.string().min(1).optional(),
    values: z.array(z.array(cell)).min(1),
  })
  .strict();

export const createFolderSchema = z.object({ name: z.string().trim().min(1).max(200), parentId: id.optional() }).strict();

export const createKeySchema = z.object({ name: z.string().trim().min(1).max(100) }).strict();

export const listFilesQuery = z.object({
  kind: kind.optional(),
  folder: id.optional(),
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().regex(/^\d+$/, "cursor is invalid").optional(),
});

export const exportQuery = z.object({ format: z.enum(["html", "markdown", "text"]).default("html") });

function fail(error: z.ZodError): never {
  const issue = error.issues[0];
  const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
  throw new ApiError("validation_failed", `${where}${issue?.message ?? "Invalid input"}`);
}

export function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) fail(result.error);
  return result.data;
}

export function parseQuery<T extends z.ZodType>(schema: T, url: string): z.output<T> {
  const params = Object.fromEntries([...new URL(url).searchParams].filter(([, v]) => v !== ""));
  return parseInput(schema, params);
}

/** Reads a JSON body capped at MAX_BODY_BYTES. */
export async function readJson(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new ApiError("payload_too_large", "Body exceeds 2 MB");
  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) throw new ApiError("payload_too_large", "Body exceeds 2 MB");
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError("bad_request", "Body must be valid JSON");
  }
}

export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.output<T>> {
  return parseInput(schema, await readJson(request));
}
