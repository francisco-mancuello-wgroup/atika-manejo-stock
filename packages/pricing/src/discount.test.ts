import { describe, expect, it } from "vitest";
import { applyDiscount, type DiscountRule, effectiveDiscount } from "./index";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function rule(overrides: Partial<DiscountRule> = {}): DiscountRule {
  return {
    percent: 20,
    isActive: true,
    startsAt: null,
    endsAt: null,
    scope: "all",
    productIds: [],
    ...overrides,
  };
}

describe("applyDiscount", () => {
  it("takes the percent off and rounds to the nearest whole guaraní", () => {
    expect(applyDiscount(250_000, 20)).toBe(200_000);
    expect(applyDiscount(259_000, 20)).toBe(207_200);
    expect(applyDiscount(2_035_475, 15)).toBe(1_730_154); // 1.730.153,75
  });

  it("returns the price unchanged for 0 %", () => {
    expect(applyDiscount(259_000, 0)).toBe(259_000);
  });

  it("rejects percents outside 0-100 and negative prices", () => {
    expect(() => applyDiscount(100_000, -1)).toThrow(RangeError);
    expect(() => applyDiscount(100_000, 101)).toThrow(RangeError);
    expect(() => applyDiscount(-1, 10)).toThrow(RangeError);
  });
});

describe("effectiveDiscount", () => {
  // 2026-10-21 12:00 in Asunción (UTC-3).
  const now = new Date("2026-10-21T15:00:00.000Z");

  it("is null without discounts", () => {
    expect(effectiveDiscount([], "p1", now)).toBeNull();
  });

  it("applies an 'all' discount to any product", () => {
    expect(effectiveDiscount([rule()], "p1", now)).toBe(20);
  });

  it("applies a 'selected' discount only to its products", () => {
    const selected = rule({ scope: "selected", productIds: ["p1"] });
    expect(effectiveDiscount([selected], "p1", now)).toBe(20);
    expect(effectiveDiscount([selected], "p2", now)).toBeNull();
  });

  it("ignores inactive discounts", () => {
    expect(effectiveDiscount([rule({ isActive: false })], "p1", now)).toBeNull();
  });

  it("picks the highest percent, never stacking", () => {
    const list = [rule({ percent: 10 }), rule({ percent: 35 }), rule({ percent: 20 })];
    expect(effectiveDiscount(list, "p1", now)).toBe(35);
  });

  it("only considers discounts that apply to the product when picking the highest", () => {
    const list = [rule({ percent: 50, scope: "selected", productIds: ["p9"] }), rule()];
    expect(effectiveDiscount(list, "p1", now)).toBe(20);
  });

  it("includes the first and last day of the window (Asunción calendar days)", () => {
    const window = rule({ startsAt: day("2026-10-21"), endsAt: day("2026-10-21") });
    expect(effectiveDiscount([window], "p1", now)).toBe(20);
    // 00:30 local on the 21st is 03:30 UTC.
    expect(effectiveDiscount([window], "p1", new Date("2026-10-21T03:30:00.000Z"))).toBe(20);
    // 23:30 local on the 21st is 02:30 UTC of the 22nd.
    expect(effectiveDiscount([window], "p1", new Date("2026-10-22T02:30:00.000Z"))).toBe(20);
  });

  it("is inactive the day before the start and the day after the end", () => {
    const window = rule({ startsAt: day("2026-10-21"), endsAt: day("2026-10-21") });
    // 23:30 local on the 20th is 02:30 UTC of the 21st.
    expect(effectiveDiscount([window], "p1", new Date("2026-10-21T02:30:00.000Z"))).toBeNull();
    // 00:30 local on the 22nd is 03:30 UTC.
    expect(effectiveDiscount([window], "p1", new Date("2026-10-22T03:30:00.000Z"))).toBeNull();
  });

  it("treats a missing start or end as open-ended", () => {
    expect(effectiveDiscount([rule({ startsAt: day("2026-10-01") })], "p1", now)).toBe(20);
    expect(effectiveDiscount([rule({ endsAt: day("2026-12-31") })], "p1", now)).toBe(20);
    expect(effectiveDiscount([rule({ startsAt: day("2026-11-01") })], "p1", now)).toBeNull();
    expect(effectiveDiscount([rule({ endsAt: day("2026-10-20") })], "p1", now)).toBeNull();
  });
});
