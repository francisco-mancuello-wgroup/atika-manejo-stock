import { describe, expect, it } from "vitest";
import { collectionSlug, toPresentationPiece } from "./presentation";

const row = {
  id: "p1",
  name: "COSTA VINO",
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
    { url: "/media/products/b.webp", position: 1, focusX: 10, focusY: 90 },
    { url: "/media/products/a.webp", position: 0, focusX: 50, focusY: 20, fit: 40 },
  ],
};
const open = { showPrices: true, showSoldOutSizes: false };
const looks = [{ number: 2, name: "Costa Vino", description: "Prenda corta en tono vino" }];

describe("collectionSlug", () => {
  it("builds URL slugs from supplier names", () => {
    expect(collectionSlug("Casa Icona")).toBe("casa-icona");
    expect(collectionSlug("Átika")).toBe("atika");
    expect(collectionSlug("Zunilda Gutierrez")).toBe("zunilda-gutierrez");
    expect(collectionSlug("  Milonga  ")).toBe("milonga");
  });
});

describe("toPresentationPiece", () => {
  it("builds ordered photos, sizes, price, derived color and look description", () => {
    expect(toPresentationPiece(row, open, looks)).toEqual({
      id: "p1",
      name: "COSTA VINO",
      priceGs: 450_000,
      discountPercent: null,
      discountedPriceGs: null,
      sizes: [
        { size: "XS", available: true },
        { size: "M", available: true },
      ],
      photos: [
        { url: "/media/products/a.webp", alt: "COSTA VINO", focusX: 50, focusY: 20, fit: 40 },
        { url: "/media/products/b.webp", alt: "COSTA VINO", focusX: 10, focusY: 90, fit: null },
      ],
      color: { label: "Vino", hex: expect.stringMatching(/^#/) },
      description: "Prenda corta en tono vino",
    });
  });

  it("adds the effective discount and hides it with the price", () => {
    expect(toPresentationPiece({ ...row, discountPercent: 20 }, open, looks)).toMatchObject({
      priceGs: 450_000,
      discountPercent: 20,
      discountedPriceGs: 360_000,
    });
    expect(
      toPresentationPiece(
        { ...row, discountPercent: 20 },
        { showPrices: false, showSoldOutSizes: false },
        looks,
      ),
    ).toMatchObject({ priceGs: null, discountPercent: null, discountedPriceGs: null });
  });

  it("prefers the stored color and description over the derived ones", () => {
    const piece = toPresentationPiece(
      { ...row, color: "Marfil", description: "Hecho a mano" },
      open,
      looks,
    );
    expect(piece.color?.label).toBe("Marfil");
    expect(piece.description).toBe("Hecho a mano");
  });

  it("uses look descriptions only for products of the looks lot (Casa Icona)", () => {
    const other = { ...row, lot: { supplier: { name: "Milonga" } } };
    expect(toPresentationPiece(other, open, looks).description).toBeNull();
  });

  it("hides the price and sold-out sizes according to the settings", () => {
    const hidden = toPresentationPiece(row, { showPrices: false, showSoldOutSizes: true }, looks);
    expect(hidden.priceGs).toBeNull();
    expect(hidden.sizes.map((s) => s.size)).toEqual(["XS", "M", "L"]);
  });

  it("never leaks costs, lots, suppliers, stock counts, sales or image internals", () => {
    const wide = {
      ...row,
      originalValueUsd: 77.77,
      lot: {
        name: "Secret lot",
        costRate: 0.5,
        supplier: { name: "Casa Icona", id: "sup-secret" },
      },
      sales: [{ quantity: 1 }],
      images: [{ url: "/media/products/a.webp", position: 0, id: "img-secret", alt: "Alt secret" }],
      variants: row.variants.map((v) => ({ ...v, unitsBought: 9 })),
    };
    const piece = toPresentationPiece(wide, { ...open, showSoldOutSizes: true }, looks);
    expect(Object.keys(piece).sort()).toEqual([
      "color",
      "description",
      "discountPercent",
      "discountedPriceGs",
      "id",
      "name",
      "photos",
      "priceGs",
      "sizes",
    ]);
    for (const size of piece.sizes) expect(Object.keys(size).sort()).toEqual(["available", "size"]);
    for (const photo of piece.photos)
      expect(Object.keys(photo).sort()).toEqual(["alt", "fit", "focusX", "focusY", "url"]);
    const json = JSON.stringify(piece);
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
