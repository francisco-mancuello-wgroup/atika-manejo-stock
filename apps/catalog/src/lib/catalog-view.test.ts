import { describe, expect, it } from "vitest";
import { toCatalogProduct } from "./catalog-view";

const row = {
  id: "p1",
  name: "Vestido Lino",
  category: "vestidos",
  priceGs: 450_000,
  brand: null as string | null,
  lot: { supplier: { name: "Casa Icona" } },
  variants: [
    { size: "L", stock: 0 },
    { size: "M", stock: 3 },
    { size: "XS", stock: 1 },
  ],
  images: [
    { url: "/media/products/b.webp", position: 1 },
    { url: "/media/products/a.webp", position: 0 },
  ],
};
const open = { showPrices: true, showSoldOutSizes: false };

describe("toCatalogProduct", () => {
  it("exposes only availability per size, sorted from smallest, and the price", () => {
    expect(toCatalogProduct(row, open)).toEqual({
      id: "p1",
      name: "Vestido Lino",
      brand: "Casa Icona",
      category: "vestidos",
      priceGs: 450_000,
      sizes: [
        { size: "XS", available: true },
        { size: "M", available: true },
      ],
      inStock: true,
      imageUrl: "/media/products/a.webp",
    });
  });

  it("uses the cover (lowest position) as the image, or null without photos", () => {
    expect(toCatalogProduct(row, open).imageUrl).toBe("/media/products/a.webp");
    expect(toCatalogProduct({ ...row, images: [] }, open).imageUrl).toBeNull();
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

  it("uses the product brand, falling back to the lot's supplier name", () => {
    expect(toCatalogProduct({ ...row, brand: "Átika" }, open).brand).toBe("Átika");
    expect(toCatalogProduct(row, open).brand).toBe("Casa Icona");
    expect(toCatalogProduct({ ...row, brand: "  " }, open).brand).toBe("Casa Icona");
  });

  it("never leaks costs, lots, suppliers, stock counts or sales, even from a wide row", () => {
    const wide = {
      ...row,
      originalValueUsd: 77.77,
      costRate: 0.5,
      lot: {
        name: "Secret lot",
        costRate: 0.5,
        supplier: { name: "Casa Icona", id: "sup-secret" },
      },
      sales: [{ quantity: 1 }],
      images: [{ url: "/media/products/a.webp", position: 0, id: "img-secret", alt: "Alt secret" }],
      variants: row.variants.map((v) => ({ ...v, unitsBought: 9, stock: v.stock })),
    };
    const product = toCatalogProduct(wide, { ...open, showSoldOutSizes: true });
    expect(Object.keys(product).sort()).toEqual([
      "brand",
      "category",
      "id",
      "imageUrl",
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
      "sup-secret",
      "unitsBought",
      'stock"',
      "sales",
      "originalValue",
      "lot",
      "img-secret",
      "Alt secret",
    ]) {
      expect(json).not.toContain(secret);
    }
  });
});
