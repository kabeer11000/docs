import { expect, test } from "bun:test"
import { accessFor } from "./access"

const doc = {
  owner: "u1",
  sharing: {
    sharedWith: [
      { userId: "u2", status: "active", access: "editor" },
      { email: "v@x.com", status: "active", access: "viewer" },
      { userId: "u4", status: "pending", access: "editor" },
      { userId: "u5", status: "active", access: "signer" },
    ],
  },
}

test("owner writes", () => expect(accessFor(doc, { id: "u1" })).toBe("write"))
test("active editor writes", () => expect(accessFor(doc, { id: "u2" })).toBe("write"))
test("viewer by email reads", () => expect(accessFor(doc, { id: "u3", email: "v@x.com" })).toBe("read"))
test("signer reads", () => expect(accessFor(doc, { id: "u5" })).toBe("read"))
test("pending share refused", () => expect(accessFor(doc, { id: "u4" })).toBeNull())
test("stranger refused", () => expect(accessFor(doc, { id: "zz" })).toBeNull())
test("missing email never matches an email-less share", () =>
  expect(accessFor({ sharing: { sharedWith: [{ status: "active", access: "editor" }] } }, { id: "zz" })).toBeNull())
test("missing document refused", () => expect(accessFor(null, { id: "u1" })).toBeNull())
