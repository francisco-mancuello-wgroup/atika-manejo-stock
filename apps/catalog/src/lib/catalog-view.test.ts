import { describe, expect, it } from "vitest";
import { toCatalogProduct, toCatalogProductDetail } from "./catalog-view";

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
      discountPercent: null,
      discountedPriceGs: null,
      sizes: [
        { size: "XS", available: true },
        { size: "M", available: true },
      ],
      inStock: true,
      imageUrl: "/media/products/a.webp",
      detail: null,
    });
  });

  it("builds the detail line from color and a clipped description", () => {
    expect(toCatalogProduct({ ...row, color: "Verde", description: null }, open).detail).toBe(
      "Verde",
    );
    expect(toCatalogProduct({ ...row, color: null, description: "Lino fresco" }, open).detail).toBe(
      "Lino fresco",
    );
    expect(
      toCatalogProduct({ ...row, color: "Verde", description: "Lino fresco" }, open).detail,
    ).toBe("Verde · Lino fresco");
    const long = toCatalogProduct({ ...row, color: null, description: "a".repeat(400) }, open);
    expect(long.detail?.length).toBeLessThanOrEqual(140);
    expect(toCatalogProduct({ ...row, color: " ", description: " " }, open).detail).toBeNull();
  });

  it("adds the effective discount and the discounted price", () => {
    const discounted = toCatalogProduct({ ...row, discountPercent: 20 }, open);
    expect(discounted).toMatchObject({
      priceGs: 450_000,
      discountPercent: 20,
      discountedPriceGs: 360_000,
    });
    const detail = toCatalogProductDetail({ ...row, discountPercent: 20 }, open);
    expect(detail).toMatchObject({ discountPercent: 20, discountedPriceGs: 360_000 });
  });

  it("exposes neither price nor discount when prices are hidden", () => {
    const hidden = toCatalogProduct(
      { ...row, discountPercent: 20 },
      { showPrices: false, showSoldOutSizes: false },
    );
    expect(hidden).toMatchObject({ priceGs: null, discountPercent: null, discountedPriceGs: null });
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
      "detail",
      "discountPercent",
      "discountedPriceGs",
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

  it("builds the sheet detail: ordered photos named after the product, color and description", () => {
    const detail = toCatalogProductDetail(
      { ...row, color: "Verde", description: "Lino fresco", images: [...row.images] },
      { ...open, showSoldOutSizes: true },
    );
    expect(detail.images).toEqual([
      { url: "/media/products/a.webp", alt: "Vestido Lino" },
      { url: "/media/products/b.webp", alt: "Vestido Lino" },
    ]);
    expect(detail.color).toBe("Verde");
    expect(detail.description).toBe("Lino fresco");
    expect(detail.sizes.map((size) => size.size)).toEqual(["XS", "M", "L"]);
  });

  it("keeps the sheet detail free of costs, stock counts, lots and image internals", () => {
    const wide = {
      ...row,
      images: [{ url: "/media/products/a.webp", position: 0, id: "img-secret", alt: "Alt secret" }],
      variants: row.variants.map((v) => ({ ...v, unitsBought: 9 })),
      originalValueUsd: 77.77,
      lot: { name: "Secret lot", supplier: { name: "Casa Icona" } },
    };
    const detail = toCatalogProductDetail(wide, open);
    expect(Object.keys(detail).sort()).toEqual([
      "brand",
      "category",
      "color",
      "description",
      "detail",
      "discountPercent",
      "discountedPriceGs",
      "id",
      "imageUrl",
      "images",
      "inStock",
      "name",
      "priceGs",
      "sizes",
    ]);
    const json = JSON.stringify(detail);
    for (const secret of ["77.77", "Secret", "unitsBought", "img-secret", "Alt secret"]) {
      expect(json).not.toContain(secret);
    }
  });
});
