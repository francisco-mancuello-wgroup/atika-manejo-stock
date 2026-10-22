import { describe, expect, it } from "vitest";
import { type PreviewLot, previewLot } from "./preview";

const form = { exchangeRate: "7400", saleFactor: "2.5", vatPercent: "10", costPercent: "100" };
const lot: PreviewLot = {
  id: "lot-a",
  name: "Lote A",
  pricingMode: "global",
  totalShippingUsd: 20,
  products: [
    { id: "p1", name: "Remera", originalValueUsd: 100, unitsBought: 3, priceGs: 2_000_000 },
    { id: "p2", name: "Short", originalValueUsd: 40, unitsBought: 2, priceGs: 900_000 },
  ],
};

describe("previewLot", () => {
  it("prices each product with the form values and the lot shipping", () => {
    expect(previewLot(form, lot)).toEqual({
      status: "ok",
      rows: [
        {
          id: "p1",
          name: "Remera",
          units: 3,
          originalValueUsd: 100,
          shippingPerUnitUsd: 4,
          unitCostUsd: 104,
          currentPriceGs: 2_000_000,
          newPriceGs: 2_116_400,
          differenceGs: 116_400,
        },
        {
          id: "p2",
          name: "Short",
          units: 2,
          originalValueUsd: 40,
          shippingPerUnitUsd: 4,
          unitCostUsd: 44,
          currentPriceGs: 900_000,
          newPriceGs: 895_400,
          differenceGs: -4_600,
        },
      ],
    });
  });

  it("converts percentages to fractions like the schema", () => {
    const result = previewLot({ ...form, vatPercent: "0", costPercent: "50" }, lot);
    expect(result.status === "ok" && result.rows[0]).toMatchObject({
      unitCostUsd: 54,
      newPriceGs: 999_000,
    });
  });

  it("is invalid while any input is empty or out of range", () => {
    expect(previewLot({ ...form, exchangeRate: "" }, lot)).toEqual({ status: "invalid" });
    expect(previewLot({ ...form, vatPercent: "250" }, lot)).toEqual({ status: "invalid" });
    expect(previewLot({ ...form, saleFactor: "abc" }, lot)).toEqual({ status: "invalid" });
  });

  it("is empty for a lot without bought units", () => {
    expect(previewLot(form, { ...lot, products: [] })).toEqual({ status: "empty" });
    expect(
      previewLot(form, { ...lot, products: [{ ...lot.products[0], unitsBought: 0 } as never] }),
    ).toEqual({ status: "empty" });
  });
});
