// Mirrors src/hooks/use-document-permissions.ts and services/yjs-host/access.ts:
// owner and active editors write, active viewers and signers read, everyone else is refused.
// Renaming and deleting stay with the owner, as in the app.

export interface ApiUser {
  id: string;
  email?: string;
}

export type Access = "owner" | "editor" | "viewer" | "signer";

export interface AccessCheckable {
  owner?: string;
  sharing?: { sharedWith?: { userId?: string; email?: string; status?: string; access?: string }[] };
}

export function accessFor(doc: AccessCheckable | null, user: ApiUser): Access | null {
  if (!doc) return null;
  if (doc.owner === user.id) return "owner";
  const share = doc.sharing?.sharedWith?.find(
    (s) => s.status === "active" && (s.userId === user.id || (!!user.email && s.email === user.email)),
  );
  if (share?.access === "editor" || share?.access === "viewer" || share?.access === "signer") return share.access;
  return null;
}

export const canRead = (a: Access | null) => a !== null;
export const canWrite = (a: Access | null) => a === "owner" || a === "editor";
export const isOwner = (a: Access | null) => a === "owner";

/** Mongo filter for every document the user owns or has an active share on. */
export function accessibleFilter(user: ApiUser) {
  const who: Record<string, unknown>[] = [{ userId: user.id }];
  if (user.email) who.push({ email: user.email });
  return {
    $or: [{ owner: user.id }, { "sharing.sharedWith": { $elemMatch: { status: "active", $or: who } } }],
  };
}
