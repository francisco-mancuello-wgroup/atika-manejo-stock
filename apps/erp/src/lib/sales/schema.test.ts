import { parseSale } from "./schema";

const valid = {
  productId: "01900000-0000-7000-8000-000000000001",
  size: "M",
  quantity: "2",
  soldAt: "2026-10-21",
  chargedGs: "",
  customer: "  Ana  ",
  notes: "",
};

describe("parseSale", () => {
  it("parses a complete sale, trimming text and dropping blank optionals", () => {
    expect(parseSale(valid)).toEqual({
      success: true,
      data: {
        productId: valid.productId,
        size: "M",
        quantity: 2,
        soldAt: "2026-10-21",
        chargedGs: undefined,
        customer: "Ana",
        notes: undefined,
      },
    });
  });

  it("accepts a charged price per unit as whole guaraníes", () => {
    const result = parseSale({ ...valid, chargedGs: "250000" });
    expect(result.success && result.data.chargedGs).toBe(250000);
  });

  it.each([
    ["productId", ""],
    ["size", ""],
    ["quantity", "0"],
    ["quantity", "-1"],
    ["quantity", "1.5"],
    ["quantity", ""],
    ["soldAt", ""],
    ["soldAt", "21/10/2026"],
    ["soldAt", "2026-02-31"],
    ["chargedGs", "-1"],
    ["chargedGs", "1000.5"],
    ["chargedGs", "mucho"],
  ])("rejects %s = %j with a field error", (field, value) => {
    const result = parseSale({ ...valid, [field]: value });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.fieldErrors[field]).toBeTruthy();
  });
});
