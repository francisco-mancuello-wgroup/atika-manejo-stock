import { lotShippingSchema, parseLotShipping } from "./schema";

describe("parseLotShipping", () => {
  it("keeps only the shipping, rounded to two decimals", () => {
    expect(parseLotShipping({ totalShippingUsd: "320.456" })).toEqual({
      success: true,
      data: { totalShippingUsd: 320.46 },
    });
  });

  it("ignores any pricing field a stale form might still send", () => {
    const result = parseLotShipping({ totalShippingUsd: "10", saleFactor: "9", exchangeRate: "1" });
    expect(result).toEqual({ success: true, data: { totalShippingUsd: 10 } });
  });

  it("accepts a decimal comma and zero", () => {
    expect(parseLotShipping({ totalShippingUsd: "12,5" })).toMatchObject({
      success: true,
      data: { totalShippingUsd: 12.5 },
    });
    expect(parseLotShipping({ totalShippingUsd: "0" })).toMatchObject({ success: true });
  });

  it.each(["-5", "", "abc"])("rejects %j with a field error", (value) => {
    const result = parseLotShipping({ totalShippingUsd: value });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.fieldErrors.totalShippingUsd).toBeTruthy();
  });

  it("exposes the schema for reuse", () => {
    expect(lotShippingSchema.safeParse({ totalShippingUsd: "1" }).success).toBe(true);
  });
});
