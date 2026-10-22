import { describe, expect, it } from "vitest";
import {
  type LotPricingParams,
  priceGs,
  priceLot,
  roundGs,
  shippingPerUnit,
  unitCostUsd,
} from "./index";

// Casa Icona lot, August 2026: 57 units, US$ 2.265,12 shipping.
const casaIcona: LotPricingParams = {
  exchangeRate: 7400,
  saleFactor: 2.5,
  vatRate: 0.1,
  costRate: 0.7,
  totalShippingUsd: 2265.12,
};

describe("shippingPerUnit", () => {
  it("prorates total shipping across the units bought in the lot", () => {
    expect(shippingPerUnit(2265.12, 57)).toBeCloseTo(39.7389, 4);
  });

  it("is zero when the lot has no shipping cost", () => {
    expect(shippingPerUnit(0, 30)).toBe(0);
  });

  it("rejects a lot without units", () => {
    expect(() => shippingPerUnit(100, 0)).toThrow(RangeError);
  });

  it("rejects fractional units", () => {
    expect(() => shippingPerUnit(100, 2.5)).toThrow(RangeError);
  });
});

describe("unitCostUsd", () => {
  it("applies the cost rate to the original value and adds shipping per unit", () => {
    expect(unitCostUsd(120, 0.7, 39.7389)).toBeCloseTo(123.7389, 4);
  });

  it("uses the full original value when cost rate is 100 %", () => {
    expect(unitCostUsd(50, 1, 10)).toBe(60);
  });

  it("rejects a negative original value", () => {
    expect(() => unitCostUsd(-1, 0.7, 0)).toThrow(RangeError);
  });
});

describe("roundGs", () => {
  it("rounds to the nearest whole guaraní, like the price workbooks", () => {
    expect(roundGs(2_035_474.74)).toBe(2_035_475);
    expect(roundGs(2_518_086.5)).toBe(2_518_087);
    expect(roundGs(2_518_086.49)).toBe(2_518_086);
  });

  it("keeps whole guaraníes unchanged", () => {
    expect(roundGs(805_123)).toBe(805_123);
  });
});

describe("priceGs", () => {
  it("multiplies cost by sale factor, adds IVA, converts to guaraníes and rounds", () => {
    expect(priceGs(123.7389, casaIcona)).toBe(2_518_087);
  });

  it("matches the Casa Icona valued workbook (COSTA COCO)", () => {
    const workbook = { exchangeRate: 7000, saleFactor: 2.5, vatRate: 0.1 };
    expect(priceGs(unitCostUsd(120, 0.55, shippingPerUnit(2265.12, 57)), workbook)).toBe(2_035_475);
  });

  it("supports IVA exento (0 %)", () => {
    expect(priceGs(100, { ...casaIcona, vatRate: 0 })).toBe(1_850_000);
  });

  it("rejects a non-positive exchange rate", () => {
    expect(() => priceGs(100, { ...casaIcona, exchangeRate: 0 })).toThrow(RangeError);
  });
});

describe("priceLot", () => {
  it("prices every model using shipping prorated over all units in the lot", () => {
    const models = [
      { id: "palmira", originalValueUsd: 120, units: 5 },
      { id: "costa-black", originalValueUsd: 72, units: 7 },
      { id: "rest", originalValueUsd: 60, units: 45 },
    ];

    const priced = priceLot(casaIcona, models);

    expect(priced).toHaveLength(3);
    expect(priced[0]).toMatchObject({ id: "palmira", priceGs: 2_518_088 });
    expect(priced[0]?.shippingPerUnitUsd).toBeCloseTo(39.7389, 4);
    expect(priced[0]?.unitCostUsd).toBeCloseTo(123.7389, 4);
    expect(priced[1]).toMatchObject({ id: "costa-black", priceGs: 1_834_328 });
  });

  it("recalculates every price when a lot parameter changes", () => {
    const models = [{ id: "palmira", originalValueUsd: 120, units: 57 }];

    const before = priceLot(casaIcona, models)[0]?.priceGs;
    const after = priceLot({ ...casaIcona, saleFactor: 3 }, models)[0]?.priceGs;

    expect(before).toBe(2_518_088);
    expect(after).toBe(3_021_705);
  });

  it("returns an empty list for a lot without models", () => {
    expect(priceLot(casaIcona, [])).toEqual([]);
  });
});
