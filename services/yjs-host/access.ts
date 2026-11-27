// Mirrors client@web/src/hooks/use-document-permissions.ts: owner and active editors write,
// active viewers and signers read, everyone else is refused.
const sameEmail = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()

export type DocumentAccess = {
  owner?: string
  sharing?: { sharedWith?: { userId?: string; email?: string; status?: string; access?: string }[] }
}

export function accessFor(doc: DocumentAccess | null, user: { id: string; email?: string }): "write" | "read" | null {
  if (!doc) return null
  if (doc.owner === user.id) return "write"
  const share = doc.sharing?.sharedWith?.find(
    (s) => s.status === "active" && (s.userId === user.id || sameEmail(s.email, user.email)),
  )
  if (!share) return null
  if (share.access === "editor") return "write"
  if (share.access === "viewer" || share.access === "signer") return "read"
  return null
}
