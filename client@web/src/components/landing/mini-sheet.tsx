"use client";

import { useState } from "react";

type Row = { item: string; qty: number; price: number };

const START: Row[] = [
  { item: "Paper", qty: 4, price: 2.5 },
  { item: "Ink", qty: 2, price: 8 },
  { item: "Pens", qty: 6, price: 1.25 },
];

const COLS = ["A", "B", "C", "D"];
const money = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const num = (v: string) => {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/** A small working spreadsheet: change a quantity or price and the totals recalculate. */
export default function MiniSheet() {
  const [rows, setRows] = useState(START);
  // Focused cell; leaving an input shows the total's formula again.
  const [active, setActive] = useState("D5");
  const total = rows.reduce((s, r) => s + r.qty * r.price, 0);

  const formula = (() => {
    const col = active[0];
    const r = Number(active.slice(1)) - 2;
    if (active === "D5") return "=SUM(D2:D4)";
    const row = rows[r];
    if (!row) return "";
    return col === "A"
      ? row.item
      : col === "B"
        ? String(row.qty)
        : String(row.price);
  })();

  const set = (i: number, key: "qty" | "price", v: string) =>
    setRows((prev) =>
      prev.map((r, j) => (j === i ? { ...r, [key]: num(v) } : r)),
    );

  return (
    <div className="ms">
      <div className="ms__fx">
        <span className="ms__ref">{active}</span>
        <b>fx</b>
        <span className="ms__formula">{formula}</span>
      </div>
      <table className="ms__grid">
        <caption className="sr-only">
          Sample spreadsheet. Edit the quantities and prices.
        </caption>
        <thead>
          <tr>
            <th />
            {COLS.map((c) => (
              <th
                key={c}
                scope="col"
                className={active[0] === c ? "is-on" : undefined}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">1</th>
            <td className="ms__head">Item</td>
            <td className="ms__head ms__num">Qty</td>
            <td className="ms__head ms__num">Price</td>
            <td className="ms__head ms__num">Total</td>
          </tr>
          {rows.map((r, i) => (
            <tr key={r.item}>
              <th scope="row">{i + 2}</th>
              <td>{r.item}</td>
              {(["qty", "price"] as const).map((key, k) => (
                <td key={key} className="ms__num ms__edit">
                  <input
                    inputMode="decimal"
                    aria-label={`${key === "qty" ? "Quantity" : "Price"} of ${r.item}`}
                    defaultValue={r[key]}
                    onFocus={() => setActive(`${COLS[k + 1]}${i + 2}`)}
                    onChange={(e) => set(i, key, e.target.value)}
                    onBlur={() => setActive("D5")}
                  />
                </td>
              ))}
              <td className="ms__num ms__calc">{money(r.qty * r.price)}</td>
            </tr>
          ))}
          <tr className="ms__sum">
            <th scope="row">5</th>
            <td colSpan={3}>Total</td>
            <td className="ms__num ms__calc ms__total" aria-live="polite">
              {money(total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
