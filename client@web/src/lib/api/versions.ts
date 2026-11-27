import { nanoid } from "nanoid";
import type { Document } from "@shared-types";
import { db } from "./server";

export interface VersionRecord {
  id: string;
  fileId: string;
  at: string;
  by: string;
  title: string;
  kind: "doc" | "sheet" | "slides" | "pdf";
  content?: unknown;
  data?: unknown;
  size: number;
}

export const KEEP_VERSIONS = 30;
/** Snapshots larger than this are skipped: the database is a small free tier. */
export const MAX_VERSION_BYTES = 1_500_000;
/** At most one automatic snapshot per file in this window. */
export const AUTO_INTERVAL_MS = 10 * 60 * 1000;

export const versions = async () => (await db()).collection<VersionRecord>("versions");

/** Whether an automatic snapshot is due, given the newest snapshot's time. */
export const snapshotDue = (lastAt: string | undefined, now = Date.now()) =>
  !lastAt || now - Date.parse(lastAt) >= AUTO_INTERVAL_MS;

export async function snapshot(doc: Document, by: string, force = false): Promise<VersionRecord | null> {
  const col = await versions();
  const last = await col.find({ fileId: doc.id }, { projection: { at: 1 } }).sort({ at: -1 }).limit(1).next();
  if (!force && !snapshotDue(last?.at)) return null;
  const kind = doc.kind ?? "doc";
  const body = kind === "doc" ? { content: doc.pages?.[0]?.content } : { data: doc.data };
  const size = JSON.stringify(body).length;
  if (size > MAX_VERSION_BYTES) return null;
  const record: VersionRecord = { id: nanoid(), fileId: doc.id, at: new Date().toISOString(), by, title: doc.title, kind, size, ...body };
  await col.insertOne({ ...record });
  // Trim to the newest KEEP_VERSIONS.
  const old = await col.find({ fileId: doc.id }, { projection: { id: 1 } }).sort({ at: -1 }).skip(KEEP_VERSIONS).toArray();
  if (old.length) await col.deleteMany({ id: { $in: old.map((v) => v.id) } });
  return record;
}
