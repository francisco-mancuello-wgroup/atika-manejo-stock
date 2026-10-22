import { describe, expect, it } from "vitest";
import { hasActiveGroupStock, toWebVariants, type WebVariant, webStock } from "./web-stock";

const variant = (stock: number, ...allocations: [number, number][]): WebVariant => ({
  size: "M",
  stock,
  allocations: allocations.map(([allocated, sold]) => ({ allocated, sold })),
});

describe("webStock", () => {
  it("shows the whole stock of an ungrouped variant of a published product", () => {
    expect(webStock(variant(7), true)).toBe(7);
  });

  it("shows nothing for an ungrouped variant of an unpublished product", () => {
    expect(webStock(variant(7), false)).toBe(0);
  });

  it("shows the group remainder for a grouped variant, published or not", () => {
    expect(webStock(variant(10, [4, 1]), true)).toBe(3);
    expect(webStock(variant(10, [4, 1]), false)).toBe(3);
  });

  it("caps the remainder by the physical stock and floors it at zero", () => {
    expect(webStock(variant(2, [5, 0]), false)).toBe(2);
    expect(webStock(variant(5, [3, 4]), false)).toBe(0);
    expect(webStock(variant(0, [3, 0]), false)).toBe(0);
  });
});

describe("hasActiveGroupStock", () => {
  it("is true only when some variant keeps units in an active group", () => {
    expect(hasActiveGroupStock([variant(5, [2, 0])])).toBe(true);
    expect(hasActiveGroupStock([variant(5, [2, 2])])).toBe(false);
    expect(hasActiveGroupStock([variant(5)])).toBe(false);
  });
});

describe("toWebVariants", () => {
  it("replaces the stock of every variant by its web stock", () => {
    const rows = [
      { ...variant(10, [4, 1]), size: "S" },
      { ...variant(6), size: "M" },
    ];
    expect(toWebVariants(rows, true)).toEqual([
      { size: "S", stock: 3 },
      { size: "M", stock: 6 },
    ]);
    expect(toWebVariants(rows, false)).toEqual([
      { size: "S", stock: 3 },
      { size: "M", stock: 0 },
    ]);
  });
});
