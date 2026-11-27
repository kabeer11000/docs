// The expectations in query.cases.ts are what a real mongod returns. To re-verify them after
// editing the table, run each case's query with find() against a scratch mongod (e.g. the
// mongodb-memory-server package) and compare the matched indices.
import { expect, test } from "bun:test";
import { cases } from "./query.cases";
import { buildFilter, matches } from "./query";

for (const c of cases) {
    test(c.name, () => {
        const got = c.docs.map((d, i) => (matches(d, c.query) ? i : -1)).filter(i => i >= 0);
        expect(got).toEqual(c.expect);
    });
}

test("unknown operators and $-fields are rejected, not silently matched", () => {
    expect(() => buildFilter({ field: "email", op: "CONTAINS", value: "a" })).toThrow();
    expect(() => buildFilter({ field: "$where", op: "EQUAL", value: "1" })).toThrow();
    expect(() => matches({}, { $where: "true" })).toThrow();
    expect(() => matches({ a: 1 }, { a: { $regex: "1" } })).toThrow();
});
