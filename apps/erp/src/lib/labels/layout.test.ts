import {
  barRuns,
  expandLabels,
  fitText,
  LABEL_SIZE_MM,
  labelName,
  MAX_COPIES_PER_SIZE,
  parseCopies,
} from "./layout";

const variants = [
  { size: "M", barcode: "AT000002", stock: 3 },
  { size: "S", barcode: "AT000001", stock: 1 },
  { size: "L", barcode: "AT000003", stock: 0 },
];

describe("LABEL_SIZE_MM", () => {
  it("is the 50 x 25 mm label stock", () => {
    expect(LABEL_SIZE_MM).toEqual({ width: 50, height: 25 });
  });
});

describe("parseCopies", () => {
  it("reads one copies-<size> field per size, in size order, dropping zeros", () => {
    const params = new URLSearchParams({ "copies-S": "2", "copies-M": "1", "copies-L": "0" });
    expect(parseCopies(params, variants)).toEqual([
      { size: "S", copies: 2 },
      { size: "M", copies: 1 },
    ]);
  });

  it("ignores blank, negative, fractional and non-numeric values", () => {
    const params = new URLSearchParams({ "copies-S": "", "copies-M": "-3", "copies-L": "abc" });
    expect(parseCopies(params, variants)).toEqual([]);
    expect(parseCopies(new URLSearchParams({ "copies-S": "2.5" }), variants)).toEqual([]);
  });

  it("caps the copies of one size", () => {
    const params = new URLSearchParams({ "copies-S": "99999" });
    expect(parseCopies(params, variants)).toEqual([{ size: "S", copies: MAX_COPIES_PER_SIZE }]);
  });

  it("ignores sizes the product does not have", () => {
    expect(parseCopies(new URLSearchParams({ "copies-XL": "2" }), variants)).toEqual([]);
  });
});

describe("labelName", () => {
  it("prefers the catalog name and falls back to the name", () => {
    expect(labelName({ name: "VESTIDO", catalogName: "Vestido Lino" })).toBe("Vestido Lino");
    expect(labelName({ name: "VESTIDO", catalogName: null })).toBe("VESTIDO");
    expect(labelName({ name: "VESTIDO", catalogName: "  " })).toBe("VESTIDO");
  });
});

describe("expandLabels", () => {
  it("repeats one label per copy with the size, price and barcode", () => {
    const labels = expandLabels(
      { name: "Vestido", catalogName: null, priceGs: 250_000 },
      variants,
      [
        { size: "S", copies: 2 },
        { size: "M", copies: 1 },
      ],
    );
    expect(labels).toEqual([
      { name: "Vestido", size: "S", priceGs: 250_000, barcode: "AT000001" },
      { name: "Vestido", size: "S", priceGs: 250_000, barcode: "AT000001" },
      { name: "Vestido", size: "M", priceGs: 250_000, barcode: "AT000002" },
    ]);
  });
});

describe("fitText", () => {
  const measure = (text: string) => text.length;

  it("keeps text that fits", () => {
    expect(fitText("Vestido", 10, measure)).toBe("Vestido");
  });

  it("truncates with an ellipsis so the result fits", () => {
    const result = fitText("Vestido largo de lino", 10, measure);
    expect(result).toBe("Vestido l…");
    expect(measure(result)).toBeLessThanOrEqual(10);
  });
});

describe("barRuns", () => {
  it("turns alternating bar/space widths into bar runs (bars first)", () => {
    expect(barRuns([2, 1, 1, 2, 3])).toEqual([
      { start: 0, width: 2 },
      { start: 3, width: 1 },
      { start: 6, width: 3 },
    ]);
  });
});
