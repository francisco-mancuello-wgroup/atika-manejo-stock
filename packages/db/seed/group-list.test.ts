import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  type CatalogProduct,
  parseStockList,
  parseTalles,
  readGroupListInput,
  resolveStockList,
} from "./group-list";

function workbook(rows: (string | number | null)[][], sheetName = "Hoja1") {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(sheetName);
  for (const row of rows) sheet.addRow(row);
  return wb;
}

const HEADERS = ["PHOTO", "DESCRIPCION", "TALLES", "PRECIO UNITARIO Gs"];

describe("readGroupListInput", () => {
  it("reuses the db:group input and adds DRY_RUN", () => {
    const base = { GROUP_NAME: " Pink ", GROUP_FILE: "/tmp/p.xlsx" };
    expect(readGroupListInput(base)).toMatchObject({ name: "Pink", file: "/tmp/p.xlsx" });
    expect(readGroupListInput(base).dryRun).toBe(false);
    expect(readGroupListInput({ ...base, DRY_RUN: "1" }).dryRun).toBe(true);
    expect(readGroupListInput({ ...base, DRY_RUN: "0" }).dryRun).toBe(false);
    expect(() => readGroupListInput({ GROUP_FILE: "x" })).toThrow(/GROUP_NAME/);
  });
});

describe("parseTalles", () => {
  it("reads quantity and size with or without a space", () => {
    expect(parseTalles("1 S")).toEqual({ qty: 1, size: "S" });
    expect(parseTalles("2 u")).toEqual({ qty: 2, size: "U" });
    expect(parseTalles("1M")).toEqual({ qty: 1, size: "M" });
    expect(parseTalles(" 3  xl ")).toEqual({ qty: 3, size: "XL" });
  });

  it("rejects what is not '<qty> <size>'", () => {
    expect(parseTalles("S")).toBeNull();
    expect(parseTalles("0 S")).toBeNull();
    expect(parseTalles("1.5 S")).toBeNull();
    expect(parseTalles("1")).toBeNull();
    expect(parseTalles("")).toBeNull();
  });
});

describe("parseStockList", () => {
  it("reads the first sheet by header label, skips blank rows and continues the previous product", () => {
    const wb = workbook(
      [
        HEADERS,
        [null, "COSTA SOLEIL", "1 S"],
        [null],
        [],
        [null, "Lia Dress", "1 S", 1553000],
        [null, null, "1 M"],
        [null, "ATL701", "1M"],
      ],
      "Anything",
    );
    expect(parseStockList(wb)).toEqual({
      lines: [
        { description: "COSTA SOLEIL", size: "S", qty: 1, row: 2 },
        { description: "Lia Dress", size: "S", qty: 1, row: 5 },
        { description: "Lia Dress", size: "M", qty: 1, row: 6 },
        { description: "ATL701", size: "M", qty: 1, row: 7 },
      ],
      problems: [],
    });
  });

  it("finds columns by header, wherever they are", () => {
    const wb = workbook([
      ["TALLES", "x", "descripción"],
      ["2 U", null, "PALC04"],
    ]);
    expect(parseStockList(wb).lines).toEqual([
      { description: "PALC04", size: "U", qty: 2, row: 2 },
    ]);
  });

  it("reports unparseable TALLES and a continuation with nothing before it", () => {
    const wb = workbook([HEADERS, [null, null, "1 M"], [null, "MAYA", "mucho"]]);
    const { lines, problems } = parseStockList(wb);
    expect(lines).toEqual([]);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/row 2.*no product/i);
    expect(problems[1]).toMatch(/row 3.*mucho/);
  });

  it("fails without the needed headers", () => {
    expect(() => parseStockList(workbook([["X", "Y"]]))).toThrow(/DESCRIPCION/);
    expect(() => parseStockList(workbook([["DESCRIPCION", "Y"]]))).toThrow(/TALLES/);
  });
});

describe("resolveStockList", () => {
  const products: CatalogProduct[] = [
    {
      id: "p1",
      code: "ATL701",
      name: "Lia Dress",
      variants: [
        { id: "v1s", size: "S", stock: 3 },
        { id: "v1m", size: "M", stock: 1 },
      ],
    },
    { id: "p2", code: null, name: "COSTA SOLEIL", variants: [{ id: "v2s", size: "S", stock: 1 }] },
    { id: "p3", code: "DUP1", name: "Twin", variants: [{ id: "v3s", size: "S", stock: 1 }] },
    { id: "p4", code: "DUP2", name: "TWIN", variants: [{ id: "v4s", size: "S", stock: 1 }] },
    // A name that equals another product's code: the code wins.
    { id: "p5", code: null, name: "ATL701", variants: [{ id: "v5s", size: "S", stock: 9 }] },
  ];
  const line = (description: string, size: string, qty = 1, row = 2) => ({
    description,
    size,
    qty,
    row,
  });

  it("matches code first, then name, ignoring case and accents, and sums repeated lines", () => {
    const { resolved, problems } = resolveStockList(
      [
        line("atl701", "S"),
        line("ATL701", "S", 2, 3),
        line("lía dress", "M", 1, 4),
        line("costa soleil", "S", 1, 5),
      ],
      products,
    );
    expect(problems).toEqual([]);
    expect(resolved).toEqual([
      { variantId: "v1s", productName: "Lia Dress", size: "S", qty: 3, variantStock: 3 },
      { variantId: "v1m", productName: "Lia Dress", size: "M", qty: 1, variantStock: 1 },
      { variantId: "v2s", productName: "COSTA SOLEIL", size: "S", qty: 1, variantStock: 1 },
    ]);
  });

  it("lists unmatched, ambiguous and missing-size lines", () => {
    const { resolved, problems } = resolveStockList(
      [line("GHOST", "S", 1, 2), line("twin", "S", 1, 3), line("Lia Dress", "XL", 1, 4)],
      products,
    );
    expect(resolved).toEqual([]);
    expect(problems).toHaveLength(3);
    expect(problems[0]).toMatch(/row 2.*GHOST.*no product/i);
    expect(problems[1]).toMatch(/row 3.*twin.*ambiguous/i);
    expect(problems[2]).toMatch(/row 4.*Lia Dress.*XL/);
  });
});
