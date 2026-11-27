import { describe, expect, it } from "vitest";
import {
  isWorkbookSnapshot,
  snapshotToGrid,
  type WorkbookSnapshot,
} from "../grid";
import {
  getSheetTemplate,
  SHEET_TEMPLATE_CATEGORIES,
  SHEET_TEMPLATES,
  sheetTemplateData,
} from ".";
import {
  buildWorkbook,
  cellName,
  parseCell,
  type SheetTemplate,
  tint,
} from "./build";
import { CellError, SUPPORTED_FUNCTIONS as FUNCTIONS } from "./evaluate";

const formulas = (t: SheetTemplate) =>
  t.sheets.flatMap((s) =>
    s.rows.flatMap((row) =>
      row.flatMap((v) =>
        typeof v === "string" && v.startsWith("=") ? [{ sheet: s, f: v }] : [],
      ),
    ),
  );

/** The value of a cell as written in the template, by A1 reference. */
const at = (t: SheetTemplate, ref: string, sheet = 0) => {
  const [r, c] = parseCell(ref);
  return t.sheets[sheet].rows[r]?.[c] ?? null;
};
/** The label in column A on the same row as a cell. */
const labelOf = (t: SheetTemplate, ref: string) =>
  at(t, `A${parseCell(ref)[0] + 1}`);
const rowOf = (t: SheetTemplate, label: string) =>
  t.sheets[0].rows.findIndex((r) => r[0] === label) + 1;

const tpl = (id: string) => {
  const t = getSheetTemplate(id);
  if (!t) throw new Error(id);
  return t;
};

describe("sheet templates", () => {
  it("has 16 uniquely named templates in known categories", () => {
    expect(SHEET_TEMPLATES).toHaveLength(16);
    expect(new Set(SHEET_TEMPLATES.map((t) => t.id)).size).toBe(16);
    for (const t of SHEET_TEMPLATES)
      expect(SHEET_TEMPLATE_CATEGORIES).toContain(t.category);
    expect(sheetTemplateData("nope")).toBeNull();
  });

  it("tints toward white", () => {
    expect(tint("#000000", 0.5)).toBe("#808080");
    expect(tint("#3B5BFD", 0)).toBe("#3B5BFD");
    expect(tint("#3B5BFD", 1)).toBe("#FFFFFF");
  });

  it("cell names round-trip", () => {
    for (const ref of ["A1", "Z9", "AA10", "AI2"])
      expect(cellName(...parseCell(ref))).toBe(ref);
  });

  describe.each(SHEET_TEMPLATES.map((t) => [t.id, t] as const))(
    "%s",
    (_, t) => {
      const snapshot = buildWorkbook(t) as WorkbookSnapshot & {
        styles: Record<string, unknown>;
      };

      it("builds a valid workbook snapshot with styles that exist", () => {
        expect(isWorkbookSnapshot(snapshot)).toBe(true);
        expect(snapshot.sheetOrder).toHaveLength(t.sheets.length);
        for (const id of snapshot.sheetOrder) {
          const sheet = snapshot.sheets[id];
          for (const row of Object.values(sheet.cellData ?? {})) {
            for (const cell of Object.values(row ?? {})) {
              const s = (cell as { s?: string } | null)?.s;
              if (s) expect(snapshot.styles[s]).toBeTruthy();
            }
          }
          const freeze = sheet.freeze as
            | { ySplit: number; startRow: number }
            | undefined;
          if (freeze) expect(freeze.startRow).toBe(freeze.ySplit);
        }
        const grid = snapshotToGrid(snapshot);
        expect(grid[0][0].v ?? grid[0][0].f).toBe(t.sheets[0].rows[0][0]);
      });

      it("caches an error-free value for every formula cell", () => {
        t.sheets.forEach((spec, si) => {
          const cells = snapshot.sheets[snapshot.sheetOrder[si]].cellData ?? {};
          spec.rows.forEach((row, r) => {
            row.forEach((raw, c) => {
              if (!(typeof raw === "string" && raw.startsWith("="))) return;
              const cell = cells[r]?.[c];
              expect(cell?.f, `${spec.name}!${cellName(r, c)}`).toBe(raw);
              expect(
                cell?.v,
                `${spec.name}!${cellName(r, c)} ${raw}`,
              ).not.toBeUndefined();
              expect(
                cell?.v,
                `${spec.name}!${cellName(r, c)} ${raw}`,
              ).not.toBeNull();
              expect(cell?.v).not.toBeInstanceOf(CellError);
            });
          });
        });
      });

      it("styles the header with the accent", () => {
        const spec = t.sheets[0];
        const r = (spec.header ?? [0])[0];
        const c = spec.rows[r].findIndex((v) => v !== null && v !== "");
        const s = snapshot.sheets[snapshot.sheetOrder[0]].cellData?.[r]?.[c]
          ?.s as string;
        expect(snapshot.styles[s]).toMatchObject({
          bl: 1,
          bg: { rgb: t.accent },
          cl: { rgb: "#FFFFFF" },
        });
      });

      it("uses well-formed formulas with known functions and in-bounds references", () => {
        const sheetNames = new Set(t.sheets.map((s) => s.name));
        for (const { sheet, f } of formulas(t)) {
          expect((f.match(/"/g) ?? []).length % 2, f).toBe(0);
          const bare = f.replace(/"[^"]*"/g, '""');
          let depth = 0;
          for (const ch of bare) {
            depth += ch === "(" ? 1 : ch === ")" ? -1 : 0;
            expect(depth, f).toBeGreaterThanOrEqual(0);
          }
          expect(depth, f).toBe(0);
          for (const [, name] of bare.matchAll(/([A-Z]+)\(/g))
            expect(FUNCTIONS, `${name} in ${f}`).toContain(name);
          for (const [, other] of bare.matchAll(/([A-Za-z]+)!/g))
            expect(sheetNames).toContain(other);
          const local = bare.replace(
            /[A-Za-z]+!\$?[A-Z]+\$?\d+(:\$?[A-Z]+\$?\d+)?/g,
            "",
          );
          for (const [, col, row] of local.matchAll(
            /\$?([A-Z]{1,2})\$?(\d+)/g,
          )) {
            expect(Number(row), f).toBeGreaterThan(0);
            expect(Number(row), f).toBeLessThanOrEqual(
              Math.max(1000, sheet.rows.length),
            );
            expect(parseCell(`${col}1`)[1], f).toBeLessThan(40);
          }
        }
      });
    },
  );

  /** The cached value of a cell in the built workbook. */
  const cached = (id: string, ref: string, sheet = 0) => {
    const snap = buildWorkbook(tpl(id));
    const [r, c] = parseCell(ref);
    return snap.sheets[snap.sheetOrder[sheet]].cellData?.[r]?.[c]?.v;
  };

  it("caches the values the formulas mean", () => {
    // Invoice: 20 x 75 + 1 x 240 + 6 x 60 = 2,100, 20% tax.
    expect(cached("invoice", "D9")).toBe(1500);
    expect(cached("invoice", "D12")).toBe("");
    expect(cached("invoice", "D16")).toBe(2100);
    expect(cached("invoice", "D18")).toBeCloseTo(420);
    expect(cached("invoice", "D19")).toBeCloseTo(2520);
    expect(cached("invoice", "B5")).toBe(Number(at(tpl("invoice"), "B4")) + 30);
    // Loan: 250,000 at 6.5% over 30 years is 1,580.17 a month and pays off to zero.
    expect(cached("loan-calculator", "B8")).toBeCloseTo(1580.17, 2);
    expect(cached("loan-calculator", "B9")).toBe(360);
    expect(cached("loan-calculator", `E${13 + 360}`)).toBeCloseTo(0, 4);
    // Budget: income 4,800 planned; expenses add up the expense rows.
    const items = tpl("monthly-budget").sheets[0].rows.slice(1, 14);
    const planned = (type: string) =>
      items.filter((r) => r[1] === type).reduce((s, r) => s + Number(r[2]), 0);
    expect(cached("monthly-budget", "H2")).toBe(planned("Income"));
    expect(cached("monthly-budget", "H3")).toBe(planned("Expense"));
    expect(cached("monthly-budget", "H4")).toBe(
      planned("Income") - planned("Expense"),
    );
    // Grade book: Grace Lee's weighted average is an A.
    expect(cached("grade-book", "H9")).toBe("A");
    // Savings goals read the other sheet: 1,500 + 400 into the emergency fund.
    expect(cached("savings-goal", "C2")).toBe(1900);
  });

  it("invoice: line totals, subtotal, tax and total chain correctly", () => {
    const t = tpl("invoice");
    for (let r = 9; r <= 14; r++)
      expect(at(t, `D${r}`)).toBe(`=IF(B${r}="","",B${r}*C${r})`);
    expect(at(t, "C16")).toBe("Subtotal");
    expect(at(t, "D16")).toBe("=SUM(D9:D14)");
    expect(at(t, "C17")).toBe("Tax rate");
    expect(at(t, "D18")).toBe("=D16*D17");
    expect(at(t, "C19")).toBe("Total due");
    expect(at(t, "D19")).toBe("=D16+D18");
  });

  it("loan: PMT reads the labelled inputs and the schedule starts from the loan amount", () => {
    const t = tpl("loan-calculator");
    expect(at(t, "B8")).toBe("=PMT(B4/B6,B5*B6,-B3)");
    expect(["B3", "B4", "B5", "B6"].map((r) => labelOf(t, r))).toEqual([
      "Loan amount",
      "Annual interest rate",
      "Term (years)",
      "Payments per year",
    ]);
    expect(at(t, "A13")).toBe("Period");
    expect(at(t, "E14")).toBe("=$B$3-D14");
    expect(at(t, "C15")).toBe('=IF(A15="","",E14*$B$4/$B$6)');
    expect(t.sheets[0].rows.length).toBeGreaterThanOrEqual(13 + 360); // a 30-year monthly loan
  });

  it("timesheet: pay formulas point at the labelled rate cells", () => {
    const t = tpl("timesheet");
    const pay = String(at(t, `B${rowOf(t, "Overtime pay")}`));
    expect(
      [...pay.matchAll(/B(\d+)/g)].map((m) => labelOf(t, `B${m[1]}`)),
    ).toEqual(["Hourly rate", "Overtime multiplier"]);
    expect(String(at(t, "G2"))).toContain(
      `$B$${rowOf(t, "Overtime after (hours per day)")}`,
    );
    expect(at(t, `B${rowOf(t, "Total pay")}`)).toBe(
      `=B${rowOf(t, "Regular pay")}+B${rowOf(t, "Overtime pay")}`,
    );
  });

  it("grade book: weights sum to 100% and letters follow the usual thresholds", () => {
    const t = tpl("grade-book");
    const weights = t.sheets[0].rows[1].slice(1) as number[];
    expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(at(t, "H3")).toBe(
      '=IF(G3>=90,"A",IF(G3>=80,"B",IF(G3>=70,"C",IF(G3>=60,"D","F"))))',
    );
  });

  it("budget: summary reads the whole item range", () => {
    const t = tpl("monthly-budget");
    const last = t.sheets[0].rows.findIndex((r, i) => i > 0 && !r.length);
    expect(at(t, `A${last}`)).toBe("Other");
    expect(at(t, "H2")).toBe(`=SUMIF($B$2:$B$${last},"Income",C$2:C$${last})`);
  });

  it("sales pipeline: probability comes from the stage table", () => {
    const t = tpl("sales-pipeline");
    expect(at(t, "F2")).toBe("=IFERROR(VLOOKUP(D2,$L$2:$M$7,2,FALSE),0)");
    expect([at(t, "L2"), at(t, "L7")]).toEqual(["Lead", "Lost"]);
  });
});
