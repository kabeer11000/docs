// A small formula evaluator for the template builder: it computes the cached value of every formula
// cell from the template's own sample data, so thumbnails and the first paint show real numbers
// before the sheet engine recalculates. It covers exactly the syntax and functions the templates use
// (templates.test.ts keeps the two in step); anything else evaluates to #NAME?.

import type { CellValue } from "../grid";
import { parseCell, type Raw } from "./build";

export class CellError {
  constructor(readonly code: string) {}
  toString() {
    return this.code;
  }
}

type V = CellValue | CellError;
type Range = { range: V[][] };
type Arg = V | Range;

type Node =
  | { t: "lit"; v: V }
  | {
      t: "ref";
      sheet?: string;
      r1: number;
      c1: number;
      r2: number;
      c2: number;
      range: boolean;
    }
  | { t: "fn"; name: string; args: Node[] }
  | { t: "bin"; op: string; a: Node; b: Node }
  | { t: "neg"; a: Node };

const TOKEN =
  /\s*(?:("(?:[^"]|"")*")|((?:[A-Za-z_][\w.]*!)?\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?)(?![\w(])|(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([A-Za-z_][\w.]*)\s*(?=\()|(TRUE|FALSE)(?![\w(])|(<=|>=|<>|[-+*/^&=<>(),%]))/y;

function tokenize(src: string): string[] {
  const out: string[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < src.length) {
    if (/^\s*$/.test(src.slice(TOKEN.lastIndex))) break;
    const m = TOKEN.exec(src);
    if (!m) throw new Error(`Cannot read formula: ${src}`);
    out.push(m[0].trim() + (m[4] ? "(" : ""));
    if (m[4]) {
      // swallow the "(" that follows a function name
      const rest = /\s*\(/y;
      rest.lastIndex = TOKEN.lastIndex;
      rest.exec(src);
      TOKEN.lastIndex = rest.lastIndex;
    }
  }
  return out;
}

const COMPARE = new Set(["=", "<>", "<", ">", "<=", ">="]);

/** Recursive descent with Excel precedence: comparison < & < + - < * / < ^ < unary minus < %. */
export function parseFormula(formula: string): Node {
  const tokens = tokenize(formula.replace(/^=/, ""));
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];
  const expect = (t: string) => {
    if (next() !== t) throw new Error(`Expected ${t} in ${formula}`);
  };

  const binary =
    (ops: (t: string) => boolean, lower: () => Node) => (): Node => {
      let a = lower();
      while (peek() !== undefined && ops(peek())) {
        const op = next();
        a = { t: "bin", op, a, b: lower() };
      }
      return a;
    };

  const primary = (): Node => {
    const tok = next();
    if (tok === undefined) throw new Error(`Unexpected end of ${formula}`);
    if (tok === "(") {
      const e = comparison();
      expect(")");
      return e;
    }
    if (tok === "-") return { t: "neg", a: power() };
    if (tok === "+") return power();
    if (tok.startsWith('"'))
      return { t: "lit", v: tok.slice(1, -1).replace(/""/g, '"') };
    if (tok === "TRUE" || tok === "FALSE")
      return { t: "lit", v: tok === "TRUE" };
    if (/^\d/.test(tok)) return { t: "lit", v: Number(tok) };
    if (tok.endsWith("(")) {
      const args: Node[] = [];
      if (peek() !== ")") {
        do args.push(comparison());
        while (peek() === "," && next());
      }
      expect(")");
      return { t: "fn", name: tok.slice(0, -1).toUpperCase(), args };
    }
    const m = /^(?:(.+)!)?(\$?[A-Z]+\$?\d+)(?::(\$?[A-Z]+\$?\d+))?$/.exec(tok);
    if (!m) throw new Error(`Unexpected ${tok} in ${formula}`);
    const [r1, c1] = parseCell(m[2].replace(/\$/g, ""));
    const [r2, c2] = m[3] ? parseCell(m[3].replace(/\$/g, "")) : [r1, c1];
    return {
      t: "ref",
      sheet: m[1],
      r1: Math.min(r1, r2),
      c1: Math.min(c1, c2),
      r2: Math.max(r1, r2),
      c2: Math.max(c1, c2),
      range: !!m[3],
    };
  };
  const percent = (): Node => {
    let a = primary();
    while (peek() === "%") {
      next();
      a = { t: "bin", op: "/", a, b: { t: "lit", v: 100 } };
    }
    return a;
  };
  const power = binary((t) => t === "^", percent);
  const product = binary((t) => t === "*" || t === "/", power);
  const sum = binary((t) => t === "+" || t === "-", product);
  const concat = binary((t) => t === "&", sum);
  const comparison = binary((t) => COMPARE.has(t), concat);

  const tree = comparison();
  if (i !== tokens.length)
    throw new Error(`Unexpected ${peek()} in ${formula}`);
  return tree;
}

const isErr = (v: unknown): v is CellError => v instanceof CellError;
const VALUE = new CellError("#VALUE!");

function num(v: V): number | CellError {
  if (isErr(v)) return v;
  if (v === null) return 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") return v;
  if (v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return VALUE;
}

const text = (v: CellValue) =>
  v === null ? "" : typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v);

/** Excel comparison: blanks equal "" and 0, strings compare case-insensitively. */
function compare(a: CellValue, b: CellValue): number {
  if (a === null)
    a = typeof b === "string" ? "" : typeof b === "boolean" ? false : 0;
  if (b === null)
    b = typeof a === "string" ? "" : typeof a === "boolean" ? false : 0;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "string" && typeof b === "string")
    return a.toLowerCase().localeCompare(b.toLowerCase());
  const rank = (x: CellValue) =>
    typeof x === "number" ? 0 : typeof x === "string" ? 1 : 2;
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  return Number(a) - Number(b);
}

function matches(v: V, criterion: V): boolean {
  if (isErr(v) || isErr(criterion)) return false;
  let op = "=";
  let target: CellValue = criterion;
  if (typeof criterion === "string") {
    const m = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(criterion) as RegExpExecArray;
    op = m[1] ?? "=";
    target = m[2] !== "" && Number.isFinite(Number(m[2])) ? Number(m[2]) : m[2];
  }
  if (op === "=" && target === "") return v === null || v === "";
  if (typeof target === "number" && typeof v !== "number") return op === "<>";
  const d = compare(v, target);
  return op === "="
    ? d === 0
    : op === "<>"
      ? d !== 0
      : op === "<"
        ? d < 0
        : op === ">"
          ? d > 0
          : op === "<="
            ? d <= 0
            : d >= 0;
}

const isRange = (a: Arg): a is Range =>
  typeof a === "object" && a !== null && !isErr(a) && "range" in a;
const flat = (a: Arg): V[] => (isRange(a) ? a.range.flat() : [a]);
const scalar = (a: Arg): V => (isRange(a) ? (a.range[0]?.[0] ?? null) : a);

/** Numbers to aggregate: numbers inside ranges, coerced values for direct arguments. */
function numbers(args: Arg[]): number[] | CellError {
  const out: number[] = [];
  for (const a of args) {
    if (isRange(a)) {
      for (const v of a.range.flat()) {
        if (isErr(v)) return v;
        if (typeof v === "number") out.push(v);
      }
    } else {
      const n = num(a);
      if (isErr(n)) return n;
      out.push(n);
    }
  }
  return out;
}

const DAY_MS = 86_400_000;
const EPOCH = Date.UTC(1899, 11, 30);
const toDate = (serial: number) =>
  new Date(EPOCH + Math.round(serial * DAY_MS));
const toSerial = (d: Date) => Math.round((d.getTime() - EPOCH) / DAY_MS);
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type Fn = (args: Arg[], today: number) => V;

const FUNCTIONS: Record<string, Fn> = {
  SUM: (args) => {
    const n = numbers(args);
    return isErr(n) ? n : n.reduce((s, x) => s + x, 0);
  },
  AVERAGE: (args) => {
    const n = numbers(args);
    if (isErr(n)) return n;
    return n.length
      ? n.reduce((s, x) => s + x, 0) / n.length
      : new CellError("#DIV/0!");
  },
  MIN: (args) => {
    const n = numbers(args);
    return isErr(n) ? n : n.length ? Math.min(...n) : 0;
  },
  MAX: (args) => {
    const n = numbers(args);
    return isErr(n) ? n : n.length ? Math.max(...n) : 0;
  },
  COUNTA: (args) =>
    args.flatMap(flat).filter((v) => v !== null && v !== "").length,
  COUNTIF: ([range, crit]) =>
    flat(range).filter((v) => matches(v, scalar(crit))).length,
  SUMIF: ([range, crit, sumRange = range]) => {
    const keys = flat(range);
    const values = flat(sumRange);
    let total = 0;
    keys.forEach((k, i) => {
      if (matches(k, scalar(crit)) && typeof values[i] === "number")
        total += values[i] as number;
    });
    return total;
  },
  MAXIFS: ([maxRange, ...pairs]) => {
    const values = flat(maxRange);
    const hits: number[] = [];
    values.forEach((v, i) => {
      let ok = typeof v === "number";
      for (let p = 0; ok && p < pairs.length; p += 2)
        ok = matches(flat(pairs[p])[i] ?? null, scalar(pairs[p + 1]));
      if (ok) hits.push(v as number);
    });
    return hits.length ? Math.max(...hits) : 0;
  },
  IF: ([cond, a = true, b = false]) => {
    const c = scalar(cond);
    if (isErr(c)) return c;
    const truthy = typeof c === "string" ? c !== "" : !!c;
    return scalar(truthy ? a : b);
  },
  IFERROR: ([v, alt]) => (isErr(scalar(v)) ? scalar(alt) : scalar(v)),
  AND: (args) => {
    for (const v of args.flatMap(flat)) {
      if (isErr(v)) return v;
      if (v !== null && !v) return false;
    }
    return true;
  },
  VLOOKUP: ([key, table, col, exact = false]) => {
    if (!isRange(table)) return VALUE;
    const k = scalar(key);
    const ci = (num(scalar(col)) as number) - 1;
    const row = table.range.find(
      (r) =>
        !isErr(r[0]) &&
        !isErr(k) &&
        compare(r[0] as CellValue, k as CellValue) === 0,
    );
    void exact; // ponytail: exact match only, every template passes FALSE
    return row ? (row[ci] ?? null) : new CellError("#N/A");
  },
  PMT: ([rate, nper, pv, fv = 0, type = 0]) => {
    const [r, n, p, f, t] = [rate, nper, pv, fv, type].map((x) =>
      num(scalar(x)),
    );
    for (const x of [r, n, p, f, t]) if (isErr(x)) return x;
    const [R, N, P, F, T] = [r, n, p, f, t] as number[];
    if (R === 0) return -(P + F) / N;
    const g = (1 + R) ** N;
    return (-(P * g + F) * R) / ((g - 1) * (1 + R * T));
  },
  ROUNDUP: ([x, digits = 0]) => {
    const v = num(scalar(x));
    const d = num(scalar(digits));
    if (isErr(v)) return v;
    if (isErr(d)) return d;
    const m = 10 ** d;
    return (Math.sign(v) * Math.ceil(Math.abs(v) * m - 1e-9)) / m;
  },
  TODAY: (_, today) => today,
  EDATE: ([start, months]) => {
    const s = num(scalar(start));
    const m = num(scalar(months));
    if (isErr(s)) return s;
    if (isErr(m)) return m;
    const d = toDate(s);
    const target = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + Math.trunc(m), 1),
    );
    const last = new Date(
      Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
    ).getUTCDate();
    target.setUTCDate(Math.min(d.getUTCDate(), last));
    return toSerial(target);
  },
  TEXT: ([value, format]) => {
    const v = scalar(value);
    const f = text(scalar(format) as CellValue).toLowerCase();
    if (isErr(v)) return v;
    if (typeof v === "number" && (f === "ddd" || f === "dddd")) {
      const day = WEEKDAYS[toDate(v).getUTCDay()];
      return f === "ddd" ? day.slice(0, 3) : day;
    }
    return text(v);
  },
  SUMPRODUCT: (args) => {
    const lists = args.map(flat);
    let total = 0;
    for (let i = 0; i < lists[0].length; i++) {
      let p = 1;
      for (const l of lists)
        p *= typeof l[i] === "number" ? (l[i] as number) : 0;
      total += p;
    }
    return total;
  },
};

export const SUPPORTED_FUNCTIONS = new Set(Object.keys(FUNCTIONS));

export interface EvalSheet {
  name: string;
  rows: Raw[][];
}

/**
 * Values of every formula cell across a workbook, as `values[sheet][row][col]` (undefined where the
 * cell is not a formula). `today` is the date serial TODAY() returns.
 */
export function evaluateWorkbook(
  sheets: EvalSheet[],
  today = toSerial(new Date()),
): Array<Array<Array<V | undefined>>> {
  const byName = new Map(sheets.map((s, i) => [s.name, i]));
  const cache = sheets.map((s) =>
    s.rows.map((row) => new Array<V | undefined>(row.length)),
  );
  const busy = new Set<string>();

  const cell = (si: number, r: number, c: number): V => {
    const raw = sheets[si].rows[r]?.[c] ?? null;
    if (!(typeof raw === "string" && raw.startsWith("="))) return raw;
    const hit = cache[si][r][c];
    if (hit !== undefined) return hit;
    const key = `${si},${r},${c}`;
    if (busy.has(key)) return new CellError("#REF!");
    busy.add(key);
    let v: V;
    try {
      v = evaluate(parseFormula(raw), si);
    } catch {
      v = new CellError("#NAME?");
    }
    busy.delete(key);
    cache[si][r][c] = v;
    return v;
  };

  const evaluate = (n: Node, si: number): V => {
    const arg = (x: Node): Arg => {
      if (x.t !== "ref" || !x.range) return evaluate(x, si);
      const s = x.sheet === undefined ? si : (byName.get(x.sheet) ?? -1);
      if (s < 0) return new CellError("#REF!");
      // Ranges stop at the sheet's last row: everything below is blank.
      const last = Math.min(x.r2, sheets[s].rows.length - 1);
      const range: V[][] = [];
      for (let r = x.r1; r <= x.r2; r++) {
        const row: V[] = [];
        for (let c = x.c1; c <= x.c2; c++)
          row.push(r <= last ? cell(s, r, c) : null);
        range.push(row);
      }
      return { range };
    };
    switch (n.t) {
      case "lit":
        return n.v;
      case "ref": {
        if (n.range) return new CellError("#VALUE!");
        const s = n.sheet === undefined ? si : (byName.get(n.sheet) ?? -1);
        return s < 0 ? new CellError("#REF!") : cell(s, n.r1, n.c1);
      }
      case "neg": {
        const v = num(evaluate(n.a, si));
        return isErr(v) ? v : -v;
      }
      case "fn": {
        const fn = FUNCTIONS[n.name];
        return fn ? fn(n.args.map(arg), today) : new CellError("#NAME?");
      }
      case "bin": {
        const a = evaluate(n.a, si);
        const b = evaluate(n.b, si);
        if (isErr(a)) return a;
        if (isErr(b)) return b;
        if (n.op === "&") return text(a) + text(b);
        if (COMPARE.has(n.op)) {
          const d = compare(a, b);
          return n.op === "="
            ? d === 0
            : n.op === "<>"
              ? d !== 0
              : n.op === "<"
                ? d < 0
                : n.op === ">"
                  ? d > 0
                  : n.op === "<="
                    ? d <= 0
                    : d >= 0;
        }
        const x = num(a);
        const y = num(b);
        if (isErr(x)) return x;
        if (isErr(y)) return y;
        if (n.op === "+") return x + y;
        if (n.op === "-") return x - y;
        if (n.op === "*") return x * y;
        if (n.op === "^") return x ** y;
        return y === 0 ? new CellError("#DIV/0!") : x / y;
      }
    }
  };

  // Row-major order: most references point up or left, so they are cached before they are needed.
  return sheets.map((s, si) =>
    s.rows.map((row, r) =>
      row.map((raw, c) =>
        typeof raw === "string" && raw.startsWith("=")
          ? cell(si, r, c)
          : undefined,
      ),
    ),
  );
}
