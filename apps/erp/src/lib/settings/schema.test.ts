import { describe, expect, it } from "vitest";
import { parseAppSettings } from "./schema";

const form = { exchangeRate: "7450", saleFactor: "2,5", vatPercent: "10", costPercent: "55" };

describe("parseAppSettings", () => {
  it("converts percentages to fractions and accepts a decimal comma", () => {
    expect(parseAppSettings(form)).toEqual({
      success: true,
      data: {
        exchangeRate: 7450,
        saleFactor: 2.5,
        vatRate: 0.1,
        costRate: 0.55,
      },
    });
  });

  it("ignores any scope or lot ids a client still sends", () => {
    expect(parseAppSettings({ ...form, scope: "selected", lotIds: "x" })).toEqual({
      success: true,
      data: { exchangeRate: 7450, saleFactor: 2.5, vatRate: 0.1, costRate: 0.55 },
    });
  });

  it("reports one message per invalid field", () => {
    const result = parseAppSettings({
      exchangeRate: "0",
      saleFactor: "",
      vatPercent: "101",
      costPercent: "-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(result.fieldErrors).sort()).toEqual([
        "costPercent",
        "exchangeRate",
        "saleFactor",
        "vatPercent",
      ]);
    }
  });
});
