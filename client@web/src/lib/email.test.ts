import { expect, test } from "vitest";
import { sameEmail } from "./email";

test("case and whitespace do not matter", () => expect(sameEmail("QA.Bot@X.com ", "qa.bot@x.com")).toBe(true));
test("different emails differ", () => expect(sameEmail("a@x.com", "b@x.com")).toBe(false));
test("missing never matches", () => {
  expect(sameEmail(undefined, undefined)).toBe(false);
  expect(sameEmail("", "")).toBe(false);
  expect(sameEmail("a@x.com", null)).toBe(false);
});
