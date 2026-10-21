import { priceLot } from "@atika/pricing";
import { afterAll, describe, expect, it } from "vitest";
import {
  createFixtureLot,
  dbOver,
  disconnectTestDb,
  hasDatabase,
  withRollback,
} from "../../test/db";
import { computeLotPrices, recalculateLot } from "./recalculate";
import { saveLotParameters } from "./save";

const params = {
  exchangeRate: 7500,
  saleFactor: 3,
  vatRate: 0.1,
  costRate: 0.5,
  totalShippingUsd: 30,
};

describe("computeLotPrices", () => {
  it("prorates shipping over the units bought, not the current stock", () => {
    const prices = computeLotPrices(params, [
      { id: "a", originalValueUsd: 100, variants: [{ unitsBought: 2 }, { unitsBought: 1 }] },
      { id: "b", originalValueUsd: 40, variants: [{ unitsBought: 7 }] },
    ]);
    const expected = priceLot(params, [
      { id: "a", originalValueUsd: 100, units: 3 },
      { id: "b", originalValueUsd: 40, units: 7 },
    ]);
    expect(prices).toEqual(expected.map(({ id, priceGs }) => ({ id, priceGs })));
  });

  it("returns nothing when the lot has no units", () => {
    expect(computeLotPrices(params, [])).toEqual([]);
    expect(
      computeLotPrices(params, [{ id: "a", originalValueUsd: 10, variants: [{ unitsBought: 0 }] }]),
    ).toEqual([]);
  });
});

describe.skipIf(!hasDatabase)("recalculateLot (database)", () => {
  afterAll(disconnectTestDb);

  it("updates the lot and reprices every product from the new parameters", async () => {
    await withRollback(async (tx) => {
      const { lot, products } = await createFixtureLot(tx, [
        {
          name: "A",
          originalValueUsd: 100,
          variants: [
            ["M", 2, 1],
            ["S", 1, 1],
          ],
        },
        { name: "B", originalValueUsd: 40, variants: [["U", 7, 7]] },
      ]);

      const result = await recalculateLot(tx, lot.id, params);
      expect(result).toEqual({ ok: true, updatedProducts: 2 });

      const expected = priceLot(params, [
        { id: "A", originalValueUsd: 100, units: 3 },
        { id: "B", originalValueUsd: 40, units: 7 },
      ]);
      const stored = await tx.product.findMany({
        where: { lotId: lot.id },
        orderBy: { name: "asc" },
      });
      expect(stored.map((p) => p.priceGs)).toEqual(expected.map((p) => p.priceGs));
      expect(products).toHaveLength(2);

      const updatedLot = await tx.lot.findUniqueOrThrow({ where: { id: lot.id } });
      expect(updatedLot.exchangeRate.toNumber()).toBe(7500);
      expect(updatedLot.saleFactor.toNumber()).toBe(3);
      expect(updatedLot.totalShippingUsd.toNumber()).toBe(30);
    });
  });

  it("reports an unknown lot without writing", async () => {
    await withRollback(async (tx) => {
      const result = await recalculateLot(tx, "00000000-0000-7000-8000-000000000000", params);
      expect(result).toEqual({ ok: false, reason: "lot_not_found" });
    });
  });
});

describe.skipIf(!hasDatabase)("saveLotParameters (database)", () => {
  afterAll(disconnectTestDb);

  const form = {
    exchangeRate: "7500",
    saleFactor: "3",
    vatPercent: "10",
    costPercent: "50",
    totalShippingUsd: "30",
  };

  it("validates, recalculates and reports the number of repriced products", async () => {
    await withRollback(async (tx) => {
      const { lot } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 100, variants: [["M", 3, 3]] },
      ]);
      const state = await saveLotParameters(dbOver(tx), lot.id, form);
      expect(state).toMatchObject({ status: "success" });
      const product = await tx.product.findFirstOrThrow({ where: { lotId: lot.id } });
      // cost = 100 × 0.5 + 30 / 3 = 60 ; 60 × 3 × 1.1 × 7500 = 1.485.000
      expect(product.priceGs).toBe(1_485_000);
    });
  });

  it("returns field errors and does not touch the database on invalid input", async () => {
    await withRollback(async (tx) => {
      const { lot } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 100, variants: [["M", 3, 3]] },
      ]);
      const state = await saveLotParameters(dbOver(tx), lot.id, { ...form, costPercent: "150" });
      expect(state).toMatchObject({
        status: "error",
        fieldErrors: { costPercent: expect.any(String) },
      });
      expect(state.status === "error" && state.values?.costPercent).toBe("150");
      const product = await tx.product.findFirstOrThrow({ where: { lotId: lot.id } });
      expect(product.priceGs).toBe(1000);
    });
  });

  it("returns an error for an unknown lot", async () => {
    await withRollback(async (tx) => {
      const state = await saveLotParameters(
        dbOver(tx),
        "00000000-0000-7000-8000-000000000000",
        form,
      );
      expect(state).toMatchObject({ status: "error", message: "No se encontró el lote." });
    });
  });
});
