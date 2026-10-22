import { describe, expect, it } from "vitest";
import { parseAppSettings } from "./schema";

const LOT_A = "0198a1b2-0000-7000-8000-000000000001";
const LOT_B = "0198a1b2-0000-7000-8000-000000000002";
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
        scope: "new",
        lotIds: [],
      },
    });
  });

  it("keeps the chosen lots only for the selected scope", () => {
    const lotIds = [LOT_A, LOT_B, LOT_A];
    expect(parseAppSettings({ ...form, scope: "selected" }, lotIds)).toMatchObject({
      success: true,
      data: { scope: "selected", lotIds: [LOT_A, LOT_B] },
    });
    expect(parseAppSettings({ ...form, scope: "all" }, lotIds)).toMatchObject({
      success: true,
      data: { scope: "all", lotIds: [] },
    });
  });

  it("asks for at least one lot when the scope is selected", () => {
    expect(parseAppSettings({ ...form, scope: "selected" }, [])).toEqual({
      success: false,
      fieldErrors: { lotIds: "Elegí al menos un lote." },
    });
  });

  it("rejects an unknown scope and malformed lot ids", () => {
    expect(parseAppSettings({ ...form, scope: "some" })).toMatchObject({
      success: false,
      fieldErrors: { scope: expect.any(String) },
    });
    expect(parseAppSettings({ ...form, scope: "selected" }, ["nope"])).toMatchObject({
      success: false,
      fieldErrors: { lotIds: expect.any(String) },
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
