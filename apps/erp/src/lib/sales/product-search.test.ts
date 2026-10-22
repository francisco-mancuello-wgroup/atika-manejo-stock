import { describe, expect, it } from "vitest";
import type { SellableProduct } from "../queries/sales";
import { findBySizeBarcode, matchesProduct } from "./product-search";

const product: SellableProduct = {
  id: "p1",
  label: "Bot Amar A · Amarillo · C-12",
  name: "Bot Amar A",
  catalogName: "Botinera Cálida",
  color: "Amarillo",
  code: "C-12",
  brand: "Milonga",
  lotName: "Lote Otoño",
  priceGs: 100_000,
  discountPercent: null,
  discountedPriceGs: null,
  sizes: [
    { size: "S", stock: 1, barcode: "AT000001" },
    { size: "M", stock: 2, barcode: "AT000002" },
  ],
};

describe("matchesProduct", () => {
  it("matches everything for an empty query", () => {
    expect(matchesProduct(product, "  ")).toBe(true);
  });

  it("matches name, catalog name, colour, code, brand and lot, ignoring case and accents", () => {
    for (const query of ["bot amar", "calida", "AMARILLO", "c-12", "milonga", "otono"]) {
      expect(matchesProduct(product, query)).toBe(true);
    }
  });

  it("requires every word to match, in any order and field", () => {
    expect(matchesProduct(product, "amarillo milonga")).toBe(true);
    expect(matchesProduct(product, "amarillo rojo")).toBe(false);
  });
});

describe("findBySizeBarcode", () => {
  it("finds the product and size of an exact barcode, trimmed and case-insensitive", () => {
    expect(findBySizeBarcode([product], " at000002 ")).toEqual({ product, size: "M" });
  });

  it("returns null for partial or unknown barcodes", () => {
    expect(findBySizeBarcode([product], "AT0000")).toBeNull();
    expect(findBySizeBarcode([product], "")).toBeNull();
  });
});
