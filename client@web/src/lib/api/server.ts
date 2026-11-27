// Server-only: Mongo access, caller authentication and the route wrapper for /api/v1.
import type { Document, IFolderItem } from "@shared-types";
import jwt from "jsonwebtoken";
import { type Db, MongoClient } from "mongodb";
import { NextResponse } from "next/server";
import { ApiError, errorBody } from "./errors";
import { bearerToken, hashApiKey, isApiKey } from "./keys";
import { type ApiUser, accessFor } from "./permissions";
import { takeToken } from "./rate-limit";

export interface ApiKeyRecord {
  id: string;
  userId: string;
  email?: string;
  name: string;
  prefix: string;
  hash: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export interface Caller extends ApiUser {
  via: "jwt" | "key";
  keyId?: string;
}

const globalForMongo = globalThis as unknown as { __apiDb?: Promise<Db> };

export function db(): Promise<Db> {
  globalForMongo.__apiDb ??= (async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set");
    const client = await new MongoClient(uri).connect();
    const database = client.db(process.env.DOCS_DB || "kabeers-docs-cl");
    await database.collection("api_keys").createIndexes([{ key: { hash: 1 }, unique: true }, { key: { userId: 1 } }]);
    return database;
  })().catch((e) => {
    globalForMongo.__apiDb = undefined;
    throw e;
  });
  return globalForMongo.__apiDb;
}

export const documents = async () => (await db()).collection<Document>("documents");
export const folders = async () => (await db()).collection<IFolderItem>("folders");
export const apiKeys = async () => (await db()).collection<ApiKeyRecord>("api_keys");

function verifyJwt(token: string): ApiUser {
  const key = (process.env.JWT_PUBLIC_KEY || "").replace(/\\n/g, "\n");
  if (!key) throw new Error("JWT_PUBLIC_KEY is not set");
  let claims: jwt.JwtPayload;
  try {
    claims = jwt.verify(token, key, { algorithms: ["ES256"], clockTolerance: 30 }) as jwt.JwtPayload;
  } catch {
    throw new ApiError("unauthorized", "Invalid or expired token");
  }
  if (claims.token_type !== "access" || typeof claims.user_id !== "string") throw new ApiError("unauthorized", "Not an access token");
  return { id: claims.user_id, email: typeof claims.email === "string" ? claims.email : undefined };
}

/** Resolves the caller from the Bearer token (access JWT or API key) and applies the rate limit. */
export async function authenticate(request: Request, opts: { jwtOnly?: boolean } = {}): Promise<Caller> {
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) throw new ApiError("unauthorized", "Missing Authorization: Bearer <token>");

  let caller: Caller;
  if (isApiKey(token)) {
    if (opts.jwtOnly) throw new ApiError("forbidden", "API keys cannot manage API keys; sign in instead");
    const keys = await apiKeys();
    const record = await keys.findOne({ hash: hashApiKey(token), revokedAt: null });
    if (!record) throw new ApiError("unauthorized", "Invalid or revoked API key");
    caller = { id: record.userId, email: record.email, via: "key", keyId: record.id };
    void keys.updateOne({ id: record.id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
  } else {
    caller = { ...verifyJwt(token), via: "jwt" };
  }

  if (!takeToken(caller.keyId ?? caller.id)) throw new ApiError("rate_limited", "Too many requests; slow down");
  return caller;
}

/** Loads a file and the caller's access to it; 404 when it does not exist or the caller has no access. */
export async function loadFile(id: string, caller: ApiUser) {
  const doc = await (await documents()).findOne({ id }, { projection: { _id: 0 } });
  const access = accessFor(doc, caller);
  if (!doc || !access) throw new ApiError("not_found", "File not found");
  return { doc, access };
}

/** Folder the caller may put things in: their root (their user id) or a folder they own. */
export async function assertOwnFolder(folderId: string, caller: ApiUser) {
  if (folderId === caller.id) return;
  const folder = await (await folders()).findOne({ id: folderId }, { projection: { permissions: 1 } });
  if (!folder) throw new ApiError("not_found", "Folder not found");
  if (folder.permissions?.owner !== caller.id) throw new ApiError("forbidden", "You can only add to folders you own");
}

type Handler<P> = (request: Request, params: P) => Promise<Response>;

/** Wraps a route handler: awaits params and turns thrown errors into the JSON error format. */
export function route<P = Record<string, never>>(fn: Handler<P>) {
  return async (request: Request, ctx: { params: Promise<P> }) => {
    try {
      return await fn(request, await ctx.params);
    } catch (e) {
      if (e instanceof ApiError) return NextResponse.json(errorBody(e.code, e.message), { status: e.status });
      console.error("[api/v1]", request.method, new URL(request.url).pathname, e);
      return NextResponse.json(errorBody("internal", "Something went wrong"), { status: 500 });
    }
  };
}

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

export const publicKey = (k: ApiKeyRecord) => ({
  id: k.id,
  name: k.name,
  prefix: k.prefix,
  createdAt: k.createdAt,
  lastUsedAt: k.lastUsedAt,
});
