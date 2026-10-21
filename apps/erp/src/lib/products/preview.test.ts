import { priceLot } from "@atika/pricing";
import { describe, expect, it } from "vitest";
import { previewPrice } from "./preview";

const params = {
  exchangeRate: 7000,
  saleFactor: 2.5,
  vatRate: 0.1,
  costRate: 0.5,
  totalShippingUsd: 20,
};

describe("previewPrice", () => {
  it("matches the lot formula, prorating shipping over the other units plus this product's", () => {
    const preview = previewPrice({ params, otherUnits: 4, units: 2, originalValueUsd: 100 });
    const [expected] = priceLot(params, [
      { id: "a", originalValueUsd: 100, units: 2 },
      { id: "rest", originalValueUsd: 0, units: 4 },
    ]);
    expect(preview).toEqual({
      unitCostUsd: expected?.unitCostUsd,
      priceGs: expected?.priceGs,
    });
  });

  it("returns null while the data cannot be priced", () => {
    expect(previewPrice({ params, otherUnits: 0, units: 0, originalValueUsd: 100 })).toBeNull();
    expect(
      previewPrice({ params, otherUnits: 3, units: 1, originalValueUsd: Number.NaN }),
    ).toBeNull();
    expect(previewPrice({ params, otherUnits: 3, units: 1, originalValueUsd: -1 })).toBeNull();
  });
});
