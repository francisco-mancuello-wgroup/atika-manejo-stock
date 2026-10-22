import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { capAllocation, inferLotName, parseGroupSheet, readGroupInput } from "./group";

function workbook(rows: (string | number | { formula: string; result: number } | null)[][]) {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("INVENTARIO");
  for (const row of rows) {
    sheet.addRow(row.map((value) => (value && typeof value === "object" ? value : value)));
  }
  return wb;
}

const HEADERS = ["FOTO", "DESCRIPCIÓN", "TALLE", "CANT. COMPRADA", "VENDIDAS", "STOCK ACTUAL"];

describe("readGroupInput", () => {
  it("reads name, file and optional lot and window", () => {
    expect(
      readGroupInput({
        GROUP_NAME: " Pink ",
        GROUP_FILE: "/tmp/pink.xlsx",
        GROUP_LOT: "Casa Icona",
        GROUP_STARTS_AT: "2026-11-01",
        GROUP_ENDS_AT: "2026-11-30",
      }),
    ).toEqual({
      name: "Pink",
      file: "/tmp/pink.xlsx",
      lot: "Casa Icona",
      startsAt: new Date("2026-11-01T00:00:00.000Z"),
      endsAt: new Date("2026-11-30T00:00:00.000Z"),
    });
  });

  it("requires GROUP_NAME and GROUP_FILE and rejects bad dates", () => {
    expect(() => readGroupInput({ GROUP_FILE: "x.xlsx" })).toThrow(/GROUP_NAME/);
    expect(() => readGroupInput({ GROUP_NAME: "Pink" })).toThrow(/GROUP_FILE/);
    expect(() =>
      readGroupInput({ GROUP_NAME: "Pink", GROUP_FILE: "x", GROUP_STARTS_AT: "soon" }),
    ).toThrow(/GROUP_STARTS_AT/);
  });
});

describe("parseGroupSheet", () => {
  it("reads rows by header label, resolves formula results and stops at TOTALES", () => {
    const wb = workbook([
      ["CASA ICONA – INVENTARIO VALORIZADO"],
      HEADERS,
      [null, " COSTA  BLACK ", "XS", 1, 1, { formula: "D3-E3", result: 0 }],
      [null, "COSTA BLACK", "S", 2, 0, { formula: "D4-E4", result: 2 }],
      [null, "MAYA", "M", 3, 1, 2],
      [null, "TOTALES", null, 6, 2, 4],
      [null, "AFTER", "S", 1, 0, 1],
    ]);
    const parsed = parseGroupSheet(wb);
    expect(parsed.title).toBe("CASA ICONA – INVENTARIO VALORIZADO");
    expect(parsed.rows).toEqual([
      { name: "COSTA BLACK", size: "XS", stock: 0 },
      { name: "COSTA BLACK", size: "S", stock: 2 },
      { name: "MAYA", size: "M", stock: 2 },
    ]);
  });

  it("stops at an empty description and fails without the needed headers", () => {
    const wb = workbook([["T"], HEADERS, [null, "A", "S", 1, 0, 1], [null, null, "S", 1, 0, 1]]);
    expect(parseGroupSheet(wb).rows).toHaveLength(1);
    expect(() => parseGroupSheet(workbook([["T"], ["X", "Y"]]))).toThrow(/DESCRIPCION/);
  });
});

describe("inferLotName", () => {
  it("takes the title before the dash and matches lots ignoring case and accents", () => {
    expect(inferLotName("CASA ICONA – INVENTARIO VALORIZADO", ["Otro", "Casa Icona"])).toBe(
      "Casa Icona",
    );
    expect(inferLotName("ÁMBAR - X", ["Ambar"])).toBe("Ambar");
  });

  it("returns null when nothing matches", () => {
    expect(inferLotName("CASA ICONA – X", ["Otro"])).toBeNull();
  });
});

describe("capAllocation", () => {
  it("caps by physical stock and never goes below sold", () => {
    expect(capAllocation({ stockActual: 5, variantStock: 3, sold: 0 })).toBe(3);
    expect(capAllocation({ stockActual: 2, variantStock: 9, sold: 0 })).toBe(2);
    expect(capAllocation({ stockActual: 1, variantStock: 9, sold: 4 })).toBe(4);
  });
});
