import { describe, expect, it } from "vitest";
import { CHARTS_KEY, chartData, joinCharts, niceTicks, pieSlices, rangeLabel, readCharts, type SheetChart, splitCharts } from "./chart";
import { gridToPrintHtml } from "./print";

describe("chartData", () => {
  it("uses a text header row and a text label column", () => {
    const data = chartData([
      ["Month", "Sales", "Costs"],
      ["Jan", 10, 4],
      ["Feb", 12, "5"],
    ]);
    expect(data.labels).toEqual(["Jan", "Feb"]);
    expect(data.series).toEqual([
      { name: "Sales", values: [10, 12] },
      { name: "Costs", values: [4, 5] },
    ]);
  });

  it("numbers only: no header, no label column, rows numbered", () => {
    const data = chartData([
      [1, 2],
      [3, 4],
    ]);
    expect(data.labels).toEqual(["1", "2"]);
    expect(data.series.map((s) => s.name)).toEqual(["Series 1", "Series 2"]);
    expect(data.series[0].values).toEqual([1, 3]);
  });

  it("drops empty rows and columns without numbers, and treats blanks as zero", () => {
    const data = chartData([
      ["Name", "Note", "Score"],
      ["A", "x", 5],
      [null, null, null],
      ["B", "y", null],
    ]);
    expect(data.labels).toEqual(["A", "B"]);
    expect(data.series).toEqual([{ name: "Score", values: [5, 0] }]);
  });

  it("parses thousands separators and returns nothing for an empty range", () => {
    expect(chartData([["Total", "1,250"]]).series[0].values).toEqual([1250]);
    expect(chartData([[null, ""]])).toEqual({ labels: [], series: [] });
  });

  it("caps series at the palette size", () => {
    const row = Array.from({ length: 10 }, (_, i) => i);
    expect(chartData([row, row]).series).toHaveLength(6);
  });
});

describe("pieSlices", () => {
  it("keeps positive values and folds the smallest into Other past six", () => {
    const labels = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const slices = pieSlices({ labels, series: [{ name: "v", values: [8, 7, 6, 5, 4, 3, 2, -1] }] });
    expect(slices.map((s) => s.label)).toEqual(["a", "b", "c", "d", "e", "Other"]);
    expect(slices[5].value).toBe(5);
  });
});

describe("stored charts", () => {
  const chart: SheetChart = {
    id: "c1",
    sheetId: "s1",
    type: "line",
    range: { startRow: 0, startColumn: 0, endRow: 3, endColumn: 1 },
    x: 10,
    y: 20,
    w: 400,
    h: 300,
  };

  it("round-trips through the workbook data under its own key", () => {
    const wb = { sheetOrder: ["s1"], sheets: {} };
    const stored = joinCharts(wb, [chart]);
    expect(stored).toHaveProperty(CHARTS_KEY);
    const { workbook, charts } = splitCharts(stored);
    expect(workbook).toEqual(wb);
    expect(charts).toEqual([chart]);
    expect(joinCharts(wb, [])).toBe(wb);
  });

  it("skips malformed entries and repairs bad numbers", () => {
    const charts = readCharts({
      [CHARTS_KEY]: [
        null,
        { id: 1 },
        { id: "x", sheetId: "s", type: "radar", range: { startRow: 5, startColumn: -2, endRow: 1, endColumn: "z" }, w: 10 },
      ],
    });
    expect(charts).toEqual([
      { id: "x", sheetId: "s", type: "bar", range: { startRow: 5, startColumn: 0, endRow: 5, endColumn: 0 }, x: 40, y: 40, w: 240, h: 280 },
    ]);
    expect(splitCharts(null)).toEqual({ workbook: null, charts: [] });
  });

  it("labels ranges in A1 notation", () => {
    expect(rangeLabel({ startRow: 0, startColumn: 0, endRow: 9, endColumn: 27 })).toBe("A1:AB10");
  });
});

describe("niceTicks", () => {
  it("covers the range from zero in round steps", () => {
    expect(niceTicks(3, 97)).toEqual([0, 25, 50, 75, 100]);
    expect(niceTicks(-12, 30)).toEqual([-20, 0, 20, 40]);
    expect(niceTicks(0, 0)).toEqual([0, 1]);
  });
});

describe("gridToPrintHtml", () => {
  it("prints the grid as an escaped table with a header row", () => {
    const html = gridToPrintHtml(
      [
        [{ v: "Item" }, { v: "Price" }],
        [{ v: "<b>Tea</b>" }, { v: 2.5 }],
      ],
      "Shop & co",
    );
    expect(html).toContain("<title>Shop &amp; co</title>");
    expect(html).toContain("<thead><tr><th>Item</th><th>Price</th></tr></thead>");
    expect(html).toContain('<td>&lt;b&gt;Tea&lt;/b&gt;</td><td class="n">2.5</td>');
    expect(gridToPrintHtml([], "Empty")).toContain("This sheet is empty.");
  });
});
