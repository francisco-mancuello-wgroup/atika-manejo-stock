import { describe, expect, it } from "vitest";
import { toCatalogProduct } from "./catalog-view";

const row = {
  id: "p1",
  name: "Vestido Lino",
  category: "vestidos",
  priceGs: 450_000,
  variants: [
    { size: "L", stock: 0 },
    { size: "M", stock: 3 },
    { size: "XS", stock: 1 },
  ],
};
const open = { showPrices: true, showSoldOutSizes: false };

describe("toCatalogProduct", () => {
  it("exposes only availability per size, sorted from smallest, and the price", () => {
    expect(toCatalogProduct(row, open)).toEqual({
      id: "p1",
      name: "Vestido Lino",
      category: "vestidos",
      priceGs: 450_000,
      sizes: [
        { size: "XS", available: true },
        { size: "M", available: true },
      ],
      inStock: true,
    });
  });

  it("includes sold-out sizes (marked unavailable) only when the setting allows it", () => {
    const product = toCatalogProduct(row, { ...open, showSoldOutSizes: true });
    expect(product.sizes).toEqual([
      { size: "XS", available: true },
      { size: "M", available: true },
      { size: "L", available: false },
    ]);
  });

  it("hides the price when prices are not shown", () => {
    expect(toCatalogProduct(row, { ...open, showPrices: false }).priceGs).toBeNull();
  });

  it("flags products with no stock", () => {
    const sold = toCatalogProduct({ ...row, variants: [{ size: "M", stock: 0 }] }, open);
    expect(sold.inStock).toBe(false);
    expect(sold.sizes).toEqual([]);
  });

  it("never leaks costs, lots, suppliers, stock counts or sales, even from a wide row", () => {
    const wide = {
      ...row,
      originalValueUsd: 77.77,
      costRate: 0.5,
      lot: { name: "Secret lot", supplier: { name: "Secret supplier" } },
      sales: [{ quantity: 1 }],
      variants: row.variants.map((v) => ({ ...v, unitsBought: 9, stock: v.stock })),
    };
    const product = toCatalogProduct(wide, { ...open, showSoldOutSizes: true });
    expect(Object.keys(product).sort()).toEqual([
      "category",
      "id",
      "inStock",
      "name",
      "priceGs",
      "sizes",
    ]);
    for (const size of product.sizes)
      expect(Object.keys(size).sort()).toEqual(["available", "size"]);
    const json = JSON.stringify(product);
    for (const secret of [
      "77.77",
      "Secret",
      "unitsBought",
      'stock"',
      "sales",
      "originalValue",
      "lot",
    ]) {
      expect(json).not.toContain(secret);
    }
  });
});
