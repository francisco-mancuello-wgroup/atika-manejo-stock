import { describe, expect, it } from "vitest";
import { discountLabel, effectivePriceGs, priceFields } from "./price";

describe("priceFields", () => {
  it("keeps the list price when no discount applies", () => {
    expect(priceFields(450_000, null, true)).toEqual({
      priceGs: 450_000,
      discountPercent: null,
      discountedPriceGs: null,
    });
    expect(priceFields(450_000, undefined, true).discountPercent).toBeNull();
  });

  it("adds the percent and the discounted price, rounded like every price", () => {
    expect(priceFields(450_000, 20, true)).toEqual({
      priceGs: 450_000,
      discountPercent: 20,
      discountedPriceGs: 360_000,
    });
    expect(priceFields(259_000, 20, true).discountedPriceGs).toBe(207_200);
  });

  it("hides every price field when the store hides prices", () => {
    expect(priceFields(450_000, 20, false)).toEqual({
      priceGs: null,
      discountPercent: null,
      discountedPriceGs: null,
    });
  });
});

describe("effectivePriceGs", () => {
  it("is the discounted price when there is one, else the list price, else null", () => {
    expect(
      effectivePriceGs({ priceGs: 450_000, discountPercent: 20, discountedPriceGs: 360_000 }),
    ).toBe(360_000);
    expect(
      effectivePriceGs({ priceGs: 450_000, discountPercent: null, discountedPriceGs: null }),
    ).toBe(450_000);
    expect(
      effectivePriceGs({ priceGs: null, discountPercent: null, discountedPriceGs: null }),
    ).toBeNull();
  });
});

describe("discountLabel", () => {
  it("formats the badge text", () => {
    expect(discountLabel(20)).toBe("-20 %");
  });
});
