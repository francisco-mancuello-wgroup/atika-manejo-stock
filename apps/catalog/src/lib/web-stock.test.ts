import { describe, expect, it } from "vitest";
import {
  activeGroupWhere,
  toWebVariants,
  type WebVariant,
  webModeFor,
  webStock,
  webVisibilityWhere,
} from "./web-stock";

const variant = (stock: number, ...allocations: [number, number][]): WebVariant => ({
  size: "M",
  stock,
  allocations: allocations.map(([allocated, sold]) => ({ allocated, sold })),
});

describe("webModeFor", () => {
  it("is groups as soon as one group is active, manual otherwise", () => {
    expect(webModeFor(0)).toBe("manual");
    expect(webModeFor(1)).toBe("groups");
    expect(webModeFor(3)).toBe("groups");
  });
});

describe("webStock", () => {
  it("shows the whole physical stock in manual mode", () => {
    expect(webStock(variant(7), "manual")).toBe(7);
    expect(webStock(variant(0), "manual")).toBe(0);
  });

  it("shows the group remainder of a grouped size in groups mode", () => {
    expect(webStock(variant(10, [4, 1]), "groups")).toBe(3);
  });

  it("shows nothing for a size outside every active group in groups mode", () => {
    expect(webStock(variant(7), "groups")).toBe(0);
  });

  it("caps the remainder by the physical stock and floors it at zero", () => {
    expect(webStock(variant(2, [5, 0]), "groups")).toBe(2);
    expect(webStock(variant(5, [3, 4]), "groups")).toBe(0);
    expect(webStock(variant(0, [3, 0]), "groups")).toBe(0);
  });

  it("sums the remainders of several active groups", () => {
    expect(webStock(variant(10, [2, 0], [3, 1]), "groups")).toBe(4);
  });
});

describe("toWebVariants", () => {
  it("replaces the stock of every variant by its web stock", () => {
    const rows = [
      { ...variant(10, [4, 1]), size: "S" },
      { ...variant(6), size: "M" },
    ];
    expect(toWebVariants(rows, "groups")).toEqual([
      { size: "S", stock: 3 },
      { size: "M", stock: 0 },
    ]);
    expect(toWebVariants(rows, "manual")).toEqual([
      { size: "S", stock: 10 },
      { size: "M", stock: 6 },
    ]);
  });
});

describe("webVisibilityWhere", () => {
  const now = new Date("2030-01-01T00:00:00.000Z");

  it("asks for published products in manual mode", () => {
    expect(webVisibilityWhere("manual", now)).toEqual({ isPublished: true });
  });

  it("asks for products allocated in an active group in groups mode, ignoring isPublished", () => {
    expect(webVisibilityWhere("groups", now)).toEqual({
      variants: { some: { allocations: { some: { group: activeGroupWhere(now) } } } },
    });
  });
});
