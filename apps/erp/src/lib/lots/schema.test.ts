import { lotParamsSchema, parseLotParams } from "./schema";

const valid = {
  exchangeRate: "7400",
  saleFactor: "2.5",
  vatPercent: "10",
  costPercent: "55",
  totalShippingUsd: "320.5",
};

describe("parseLotParams", () => {
  it("converts percentages to stored fractions", () => {
    const result = parseLotParams(valid);
    expect(result).toEqual({
      success: true,
      data: {
        exchangeRate: 7400,
        saleFactor: 2.5,
        vatRate: 0.1,
        costRate: 0.55,
        totalShippingUsd: 320.5,
      },
    });
  });

  it("keeps four decimals of a fraction and accepts a decimal comma", () => {
    const result = parseLotParams({ ...valid, vatPercent: "7,5", costPercent: "33.333" });
    expect(result.success && result.data.vatRate).toBe(0.075);
    expect(result.success && result.data.costRate).toBe(0.3333);
  });

  it("accepts a zero shipping cost and the 0 and 100 percent limits", () => {
    const result = parseLotParams({
      ...valid,
      totalShippingUsd: "0",
      vatPercent: "0",
      costPercent: "100",
    });
    expect(result.success && result.data).toMatchObject({
      totalShippingUsd: 0,
      vatRate: 0,
      costRate: 1,
    });
  });

  it.each([
    ["exchangeRate", "0"],
    ["exchangeRate", "-7000"],
    ["exchangeRate", ""],
    ["exchangeRate", "abc"],
    ["saleFactor", "0"],
    ["vatPercent", "-1"],
    ["vatPercent", "100.5"],
    ["costPercent", "101"],
    ["totalShippingUsd", "-5"],
  ])("rejects %s = %j with a field error", (field, value) => {
    const result = parseLotParams({ ...valid, [field]: value });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(result.fieldErrors)).toContain(field);
      expect(result.fieldErrors[field]).toBeTruthy();
    }
  });

  it("exposes the schema for reuse", () => {
    expect(lotParamsSchema.safeParse(valid).success).toBe(true);
  });
});
