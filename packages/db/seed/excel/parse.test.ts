import { describe, expect, it } from "vitest";
import { buildWorkbook, type TestCell } from "./fixtures";
import { parseInventoryWorkbook, parseSalesNote } from "./parse";

const OPTIONS = {
  supplier: "Test Supplier",
  lotName: "Test Lot",
  shipping: { kind: "none" },
  saleFactor: 2.5,
  vatRate: 0.1,
} as const;

const struck = (value: string | number): TestCell => ({ value, strike: true });

// Casa Icona style: one row per size, quantity column, total cost stored in "unit cost".
const ROW_PER_SIZE_HEADER: TestCell[] = [
  "PHOTO",
  "DESCRIPCION",
  "VALOR ORIGINAL",
  "TALLES",
  "CANTIDAD",
  "COSTO UNITARIO USD",
  "COSTO TOTAL USD",
  "PRECIO UNITARIO USD",
  "PRECIO UNITARIO Gs",
  "VENTAS (fecha)\n\n",
];

function rowPerSizeSheet() {
  return buildWorkbook([
    ["LOT TITLE"],
    ROW_PER_SIZE_HEADER,
    [null, "COSTA SOLEIL", 120, "XS", 1, 66, 66, 300, 2102700, null],
    [null, "COSTA SOLEIL", 120, "S", 2, 132, 264, 300, 2102700, null],
    [
      null,
      "COSTA BLACK",
      100,
      struck("M"),
      struck(1),
      struck(55),
      55,
      300,
      2102700,
      "23/06/2026 RETIRO ANDREA",
    ],
    [null, null, null, null, 3, null, 385, null, null, null],
  ]);
}

describe("parseInventoryWorkbook, one row per size", () => {
  it("groups consecutive rows of the same model into variants", () => {
    const lot = parseInventoryWorkbook(rowPerSizeSheet(), OPTIONS);
    expect(lot.products.map((p) => p.name)).toEqual(["COSTA SOLEIL", "COSTA BLACK"]);
    expect(lot.products[0]?.variants).toEqual([
      { size: "XS", unitsBought: 1, sold: 0 },
      { size: "S", unitsBought: 2, sold: 0 },
    ]);
  });

  it("divides the total stored in unit cost by the quantity", () => {
    const lot = parseInventoryWorkbook(rowPerSizeSheet(), OPTIONS);
    // 132 over 2 units is 66 per unit, the same as the single-unit XS row: one cost, 55 % of 120.
    expect(lot.costRate).toBeCloseTo(0.55, 4);
    expect(lot.products[0]?.originalValueUsd).toBe(120);
  });

  it("takes the exchange rate from the Gs and USD price columns", () => {
    expect(parseInventoryWorkbook(rowPerSizeSheet(), OPTIONS).exchangeRate).toBe(7009);
  });

  it("records a struck row as a sale dated from the sales note", () => {
    const lot = parseInventoryWorkbook(rowPerSizeSheet(), OPTIONS);
    expect(lot.products[1]?.variants).toEqual([{ size: "M", unitsBought: 1, sold: 1 }]);
    expect(lot.sales).toEqual([
      {
        productIndex: 1,
        size: "M",
        quantity: 1,
        soldAt: "2026-06-23",
        note: "23/06/2026 RETIRO ANDREA",
      },
    ]);
  });

  it("skips the totals row", () => {
    expect(parseInventoryWorkbook(rowPerSizeSheet(), OPTIONS).products).toHaveLength(2);
  });

  it("falls back to cost rate 1 and the unit cost when ratios differ", () => {
    const workbook = buildWorkbook([
      ROW_PER_SIZE_HEADER,
      [null, "A", 100, "S", 1, 50, 50, 1, 7009, null],
      [null, "B", 100, "S", 1, 60, 60, 1, 7009, null],
    ]);
    const lot = parseInventoryWorkbook(workbook, OPTIONS);
    expect(lot.costRate).toBe(1);
    expect(lot.products.map((p) => p.originalValueUsd)).toEqual([50, 60]);
    expect(lot.warnings.join("\n")).toMatch(/cost rate/i);
  });
});

// Zunilda style: two header rows, size columns, code and colour, sales notes with sizes.
function sizeColumnsSheet() {
  return buildWorkbook(
    [
      [null, null, "SUPPLIER TITLE"],
      [
        "PHOTO",
        "NOMBRE",
        "CODIGO",
        "COLOR",
        "TALLAS",
        "TALLAS",
        "TALLAS",
        "CANTIDAD",
        "COSTO UNITARIO USD",
        "PRECIO UNITARIO USD",
        "PRECIO UNITARIO Gs",
        "VENTAS (fecha)",
      ],
      [
        "PHOTO",
        "NOMBRE",
        "CODIGO",
        "COLOR",
        "XS",
        "S",
        "M",
        "CANTIDAD",
        "COSTO UNITARIO USD",
        "PRECIO UNITARIO USD",
        "PRECIO UNITARIO Gs",
        "VENTAS (fecha)",
      ],
      [null, "PALOMA MINIDRESS", "ZG885", "BLANCO", 1, 2, null, 3, 130, 433.5, 3038401.5, null],
      [
        null,
        "EPIFITA",
        "ZG897",
        "NEGRO",
        struck(2),
        1,
        null,
        3,
        188,
        607.5,
        4257967.5,
        "XS -16/12/2025        XS -24/12/2025",
      ],
      [null, "JARDIN MAXI", "ZG342", null, 1, 1, 1, 3, 132, 439.5, 3080455.5, null],
      [null, null, null, null, null, null, null, 7, null, null, null, null],
    ],
    new Date("2025-10-06T00:00:00Z"),
  );
}

describe("parseInventoryWorkbook, size columns", () => {
  const options = {
    ...OPTIONS,
    shipping: { kind: "gs", amount: 7_009_000 },
  } as const;

  it("reads code, colour and units per size column", () => {
    const lot = parseInventoryWorkbook(sizeColumnsSheet(), options);
    expect(lot.products[0]).toMatchObject({
      code: "ZG885",
      name: "PALOMA MINIDRESS",
      color: "BLANCO",
      originalValueUsd: 130,
    });
    expect(lot.products[0]?.variants).toEqual([
      { size: "XS", unitsBought: 1, sold: 0 },
      { size: "S", unitsBought: 2, sold: 0 },
    ]);
  });

  it("keeps a missing colour as null", () => {
    expect(parseInventoryWorkbook(sizeColumnsSheet(), options).products[2]?.color).toBeNull();
  });

  it("treats a struck size cell as sales dated by the sized notes", () => {
    const lot = parseInventoryWorkbook(sizeColumnsSheet(), options);
    expect(lot.products[1]?.variants[0]).toEqual({ size: "XS", unitsBought: 2, sold: 2 });
    expect(lot.sales.map((s) => [s.size, s.quantity, s.soldAt])).toEqual([
      ["XS", 1, "2025-12-16"],
      ["XS", 1, "2025-12-24"],
    ]);
  });

  it("converts a Gs shipping total to USD with the lot exchange rate", () => {
    const lot = parseInventoryWorkbook(sizeColumnsSheet(), options);
    expect(lot.exchangeRate).toBe(7009);
    expect(lot.totalShippingUsd).toBe(1000);
  });

  it("uses cost rate 1 when there is no original value column", () => {
    expect(parseInventoryWorkbook(sizeColumnsSheet(), options).costRate).toBe(1);
  });

  it("uses the workbook creation date as purchase date unless overridden", () => {
    expect(parseInventoryWorkbook(sizeColumnsSheet(), options).purchasedAt).toBe("2025-10-06");
    expect(
      parseInventoryWorkbook(sizeColumnsSheet(), { ...options, purchasedAt: "2025-11-01" })
        .purchasedAt,
    ).toBe("2025-11-01");
  });

  it("reads formula results", () => {
    const workbook = buildWorkbook([
      [
        "PHOTO",
        "NOMBRE",
        "TALLAS",
        "TALLAS",
        "CANTIDAD",
        "COSTO UNITARIO USD",
        "PRECIO UNITARIO USD",
        "PRECIO UNITARIO Gs",
      ],
      [
        "PHOTO",
        "NOMBRE",
        "S",
        "M",
        "CANTIDAD",
        "COSTO UNITARIO USD",
        "PRECIO UNITARIO USD",
        "PRECIO UNITARIO Gs",
      ],
      [null, "X", 1, 1, { value: { formula: "C3+D3", result: 2 } }, 10, 25, 175225],
    ]);
    const lot = parseInventoryWorkbook(workbook, OPTIONS);
    expect(lot.products[0]?.originalValueUsd).toBe(10);
    expect(lot.exchangeRate).toBe(7009);
  });
});

// Milonga style: REFERENCIA code, combined sizes, notes that mark a sale on a non-struck cell.
function milongaSheet() {
  return buildWorkbook([
    [
      null,
      "REFERENCIA",
      "DESCRIPCIÓN",
      "COLOR",
      "TALLES",
      "TALLES",
      "TALLES",
      "TALLES",
      "CANTIDAD",
      "COSTO UNITARIO USD",
      "PRECIO UNITARIO USD",
      "PRECIO UNITARIO Gs",
      "VENTAS (fecha)",
    ],
    [
      "PHOTO",
      "REFERENCIA",
      "DESCRIPCIÓN",
      "COLOR",
      "U",
      "S",
      "XS/S",
      "M/L",
      "CANTIDAD",
      "COSTO UNITARIO USD",
      "PRECIO UNITARIO USD",
      "PRECIO UNITARIO Gs",
      "VENTAS (fecha)",
    ],
    [
      null,
      "ATLC02",
      "S PANTA   A",
      "ESTAMPADO",
      null,
      2,
      null,
      null,
      2,
      28.2,
      123.6,
      866312.4,
      "1 (S) - 23/06/2026 RETIRO ANDREA",
    ],
    [null, "PALC04", "Cardigan   A", "MARFIL", null, null, 3, 2, 5, 24.5, 112.5, 788512.5, null],
    [
      null,
      struck("ARTC07"),
      struck("Camisa     A"),
      struck("MARFIL"),
      1,
      null,
      null,
      null,
      struck(1),
      struck(43.5),
      169.5,
      1188025.5,
      "23/06/2026 RETIRO ANDREA",
    ],
  ]);
}

describe("parseInventoryWorkbook, Milonga style", () => {
  it("reads the reference as code and collapses repeated spaces in names", () => {
    const lot = parseInventoryWorkbook(milongaSheet(), OPTIONS);
    expect(lot.products.map((p) => [p.code, p.name])).toEqual([
      ["ATLC02", "S PANTA A"],
      ["PALC04", "Cardigan A"],
      ["ARTC07", "Camisa A"],
    ]);
  });

  it("keeps combined sizes as their own variants", () => {
    const lot = parseInventoryWorkbook(milongaSheet(), OPTIONS);
    expect(lot.products[1]?.variants).toEqual([
      { size: "XS/S", unitsBought: 3, sold: 0 },
      { size: "M/L", unitsBought: 2, sold: 0 },
    ]);
  });

  it("records a sale from a sized note even when no cell is struck", () => {
    const lot = parseInventoryWorkbook(milongaSheet(), OPTIONS);
    expect(lot.products[0]?.variants).toEqual([{ size: "S", unitsBought: 2, sold: 1 }]);
    expect(lot.sales[0]).toMatchObject({
      productIndex: 0,
      size: "S",
      quantity: 1,
      soldAt: "2026-06-23",
    });
  });

  it("does not count a struck cell and its matching note twice", () => {
    const workbook = buildWorkbook([
      [
        null,
        "REFERENCIA",
        "DESCRIPCIÓN",
        "TALLES",
        "TALLES",
        "CANTIDAD",
        "COSTO UNITARIO USD",
        "PRECIO UNITARIO USD",
        "PRECIO UNITARIO Gs",
        "VENTAS (fecha)",
      ],
      [
        "PHOTO",
        "REFERENCIA",
        "DESCRIPCIÓN",
        "S",
        "M",
        "CANTIDAD",
        "COSTO UNITARIO USD",
        "PRECIO UNITARIO USD",
        "PRECIO UNITARIO Gs",
        "VENTAS (fecha)",
      ],
      [
        null,
        "PAL102",
        "Triangulo",
        1,
        struck(1),
        2,
        18.75,
        95.25,
        667607.25,
        "1 (M) - 23/06/2026 RETIRO ANDREA",
      ],
    ]);
    const lot = parseInventoryWorkbook(workbook, OPTIONS);
    expect(lot.sales).toHaveLength(1);
    expect(lot.products[0]?.variants).toEqual([
      { size: "S", unitsBought: 1, sold: 0 },
      { size: "M", unitsBought: 1, sold: 1 },
    ]);
  });

  it("leaves the sale date null when no date is written", () => {
    const workbook = buildWorkbook([
      [
        null,
        "REFERENCIA",
        "DESCRIPCIÓN",
        "TALLES",
        "CANTIDAD",
        "COSTO UNITARIO USD",
        "PRECIO UNITARIO USD",
        "PRECIO UNITARIO Gs",
      ],
      [
        "PHOTO",
        "REFERENCIA",
        "DESCRIPCIÓN",
        "M",
        "CANTIDAD",
        "COSTO UNITARIO USD",
        "PRECIO UNITARIO USD",
        "PRECIO UNITARIO Gs",
      ],
      [null, "X1", "Top", struck(1), 1, 10, 10, 70090],
    ]);
    expect(parseInventoryWorkbook(workbook, OPTIONS).sales[0]?.soldAt).toBeNull();
  });
});

// Átika style: brand column, Date cells as sale dates, cost columns carrying the exchange rate.
function atikaSheet() {
  return buildWorkbook([
    ["TITLE"],
    [
      "PHOTO",
      "DESCRIPCIÓN",
      "MARCA",
      "TALLE",
      "TALLE",
      "TALLE",
      "CANTIDAD",
      "COSTO UNITARIO USD",
      "COSTO UNITARIO Gs",
      "VENTAS (fecha)",
    ],
    [
      "PHOTO",
      "DESCRIPCIÓN",
      "MARCA",
      "U",
      "XS",
      "S",
      "CANTIDAD",
      "COSTO UNITARIO USD",
      "COSTO UNITARIO Gs",
      "VENTAS (fecha)",
    ],
    [null, "Ginger Maxi", "Zunilda Gutierrez", null, null, 1, 1, 193, 1428200, null],
    [null, "Aros Oriente", "Sordo", 2, null, null, 2, 176, 1302400, null],
    [
      null,
      null,
      "Casa Icona",
      null,
      null,
      struck(1),
      1,
      67,
      478380,
      new Date("2025-11-28T00:00:00Z"),
    ],
    [null, "Poncho", "Milonga", null, null, 2, 2, 98, 725200, null],
    [null, null, null, null, null, null, 4, null, null, null],
  ]);
}

describe("parseInventoryWorkbook, brand column style", () => {
  it("reads the brand and uses the unit cost as original value", () => {
    const lot = parseInventoryWorkbook(atikaSheet(), OPTIONS);
    expect(lot.products[0]).toMatchObject({
      name: "Ginger Maxi",
      brand: "Zunilda Gutierrez",
      originalValueUsd: 193,
    });
    expect(lot.products[1]?.variants).toEqual([{ size: "U", unitsBought: 2, sold: 0 }]);
  });

  it("names unnamed rows after their brand", () => {
    const lot = parseInventoryWorkbook(atikaSheet(), OPTIONS);
    expect(lot.products[2]?.name).toBe("Sin nombre (Casa Icona)");
    expect(lot.warnings.join("\n")).toMatch(/no name/i);
  });

  it("reads Date cells as sale dates", () => {
    const lot = parseInventoryWorkbook(atikaSheet(), OPTIONS);
    expect(lot.sales).toEqual([
      { productIndex: 2, size: "S", quantity: 1, soldAt: "2025-11-28", note: null },
    ]);
  });

  it("uses the most common exchange rate and warns about rows that differ", () => {
    const lot = parseInventoryWorkbook(atikaSheet(), OPTIONS);
    expect(lot.exchangeRate).toBe(7400);
    expect(lot.warnings.join("\n")).toMatch(/exchange rate 7140/);
  });

  it("has no shipping when none is configured", () => {
    expect(parseInventoryWorkbook(atikaSheet(), OPTIONS).totalShippingUsd).toBe(0);
  });
});

describe("parseInventoryWorkbook, failures", () => {
  it("fails loudly when there is no header with a quantity column", () => {
    expect(() => parseInventoryWorkbook(buildWorkbook([["nothing here"]]), OPTIONS)).toThrow(
      /header/i,
    );
  });

  it("fails on a struck size the sale note disagrees with", () => {
    const workbook = buildWorkbook([
      [
        null,
        "REFERENCIA",
        "DESCRIPCIÓN",
        "TALLES",
        "CANTIDAD",
        "COSTO UNITARIO USD",
        "PRECIO UNITARIO USD",
        "PRECIO UNITARIO Gs",
        "VENTAS (fecha)",
      ],
      [
        "PHOTO",
        "REFERENCIA",
        "DESCRIPCIÓN",
        "M",
        "CANTIDAD",
        "COSTO UNITARIO USD",
        "PRECIO UNITARIO USD",
        "PRECIO UNITARIO Gs",
        "VENTAS (fecha)",
      ],
      [null, "X1", "Top", 1, 1, 10, 10, 70090, "1 (XL) - 23/06/2026"],
    ]);
    expect(() => parseInventoryWorkbook(workbook, OPTIONS)).toThrow(/XL/);
  });
});

describe("parseSalesNote", () => {
  it("parses a bare date as an unsized entry", () => {
    expect(parseSalesNote("23/06/2026 RETIRO ANDREA")).toEqual([
      { size: null, quantity: null, soldAt: "2026-06-23" },
    ]);
  });

  it("parses 'n (SIZE) - date'", () => {
    expect(parseSalesNote("1 (S) - 23/06/2026 RETIRO ANDREA")).toEqual([
      { size: "S", quantity: 1, soldAt: "2026-06-23" },
    ]);
  });

  it("parses repeated 'SIZE -date' entries", () => {
    expect(parseSalesNote("XS -16/12/2025       XS -24/12/2025")).toEqual([
      { size: "XS", quantity: 1, soldAt: "2025-12-16" },
      { size: "XS", quantity: 1, soldAt: "2025-12-24" },
    ]);
  });

  it("parses ISO dates and ignores empty notes", () => {
    expect(parseSalesNote("2025-12-29")).toEqual([
      { size: null, quantity: null, soldAt: "2025-12-29" },
    ]);
    expect(parseSalesNote("")).toEqual([]);
  });
});
