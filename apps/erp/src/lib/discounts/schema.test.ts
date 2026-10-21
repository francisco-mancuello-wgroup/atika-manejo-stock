import { describe, expect, it } from "vitest";
import { parseDiscount } from "./schema";

const valid = { name: "Liquidación", percent: "20", scope: "all", isActive: "on" };

describe("parseDiscount", () => {
  it("parses a discount for every product without dates", () => {
    expect(parseDiscount(valid, [])).toEqual({
      success: true,
      data: {
        name: "Liquidación",
        percent: 20,
        isActive: true,
        startsAt: null,
        endsAt: null,
        scope: "all",
        productIds: [],
      },
    });
  });

  it("treats an unchecked box as inactive and trims the name", () => {
    const result = parseDiscount({ ...valid, name: "  Verano ", isActive: undefined as never }, []);
    expect(result).toMatchObject({ success: true, data: { name: "Verano", isActive: false } });
  });

  it("requires a name", () => {
    expect(parseDiscount({ ...valid, name: " " }, [])).toMatchObject({
      success: false,
      fieldErrors: { name: expect.any(String) },
    });
  });

  it.each(["0", "91", "-5", "12,5", "abc", ""])("rejects the percent %j", (percent) => {
    expect(parseDiscount({ ...valid, percent }, [])).toMatchObject({
      success: false,
      fieldErrors: { percent: expect.any(String) },
    });
  });

  it.each(["1", "90"])("accepts the percent limit %s", (percent) => {
    expect(parseDiscount({ ...valid, percent }, [])).toMatchObject({ success: true });
  });

  it("reads optional dates and accepts a single-day window", () => {
    const result = parseDiscount({ ...valid, startsAt: "2026-11-01", endsAt: "2026-11-01" }, []);
    expect(result).toMatchObject({
      success: true,
      data: { startsAt: "2026-11-01", endsAt: "2026-11-01" },
    });
  });

  it("rejects an end before the start", () => {
    expect(
      parseDiscount({ ...valid, startsAt: "2026-11-02", endsAt: "2026-11-01" }, []),
    ).toMatchObject({
      success: false,
      fieldErrors: { endsAt: expect.any(String) },
    });
  });

  it("rejects malformed or impossible dates", () => {
    expect(parseDiscount({ ...valid, startsAt: "01/11/2026" }, [])).toMatchObject({
      success: false,
      fieldErrors: { startsAt: expect.any(String) },
    });
    expect(parseDiscount({ ...valid, endsAt: "2026-02-31" }, [])).toMatchObject({
      success: false,
      fieldErrors: { endsAt: expect.any(String) },
    });
  });

  it("rejects an unknown scope", () => {
    expect(parseDiscount({ ...valid, scope: "some" }, [])).toMatchObject({
      success: false,
      fieldErrors: { scope: expect.any(String) },
    });
  });

  it("requires at least one product when the scope is selected", () => {
    expect(parseDiscount({ ...valid, scope: "selected" }, [])).toMatchObject({
      success: false,
      fieldErrors: { productIds: "Elegí al menos un producto." },
    });
  });

  it("keeps the unique, well-formed product ids of a selected scope", () => {
    const a = "0190f3a0-0000-7000-8000-000000000001";
    const b = "0190f3a0-0000-7000-8000-000000000002";
    expect(parseDiscount({ ...valid, scope: "selected" }, [a, b, a, "nope"])).toMatchObject({
      success: true,
      data: { scope: "selected", productIds: [a, b] },
    });
  });

  it("drops the product list when the scope is all", () => {
    const a = "0190f3a0-0000-7000-8000-000000000001";
    expect(parseDiscount(valid, [a])).toMatchObject({ success: true, data: { productIds: [] } });
  });
});
