import { priceLot } from "@atika/pricing";
import { afterAll, describe, expect, it } from "vitest";
import {
  createFixtureLot,
  dbOver,
  disconnectTestDb,
  hasDatabase,
  withRollback,
} from "../../test/db";
import { saveLotParams, setLotPricingMode } from "./pricing-mode";

const form = { exchangeRate: "7450", saleFactor: "3", vatPercent: "5", costPercent: "60" };
const UNKNOWN_LOT = "00000000-0000-7000-8000-000000000000";

async function customLot(tx: Parameters<typeof createFixtureLot>[0]) {
  const fixture = await createFixtureLot(tx, [
    { name: "A", originalValueUsd: 100, variants: [["M", 3, 3]] },
  ]);
  await tx.lot.update({ where: { id: fixture.lot.id }, data: { pricingMode: "custom" } });
  return fixture;
}

describe.skipIf(!hasDatabase)("lot pricing mode (database)", () => {
  afterAll(disconnectTestDb);

  describe("saveLotParams", () => {
    it("stores the values as fractions and reprices only that lot's products", async () => {
      await withRollback(async (tx) => {
        const { lot, products } = await customLot(tx);
        const other = await createFixtureLot(tx, [
          { name: "B", originalValueUsd: 40, priceGs: 777000, variants: [["U", 2, 2]] },
        ]);

        const state = await saveLotParams(dbOver(tx), lot.id, form);
        expect(state).toEqual({
          status: "success",
          message: "Parámetros propios guardados. Se recalculó 1 precio.",
        });

        const stored = await tx.lot.findUniqueOrThrow({ where: { id: lot.id } });
        expect(stored.pricingMode).toBe("custom");
        expect(stored.exchangeRate.toNumber()).toBe(7450);
        expect(stored.saleFactor.toNumber()).toBe(3);
        expect(stored.vatRate.toNumber()).toBe(0.05);
        expect(stored.costRate.toNumber()).toBe(0.6);
        expect(stored.totalShippingUsd.toNumber()).toBe(20);
        const [expected] = priceLot(
          { exchangeRate: 7450, saleFactor: 3, vatRate: 0.05, costRate: 0.6, totalShippingUsd: 20 },
          [{ id: "x", originalValueUsd: 100, units: 3 }],
        );
        const product = await tx.product.findUniqueOrThrow({ where: { id: products[0]?.id } });
        expect(product.priceGs).toBe(expected?.priceGs);

        const untouched = await tx.product.findUniqueOrThrow({
          where: { id: other.products[0]?.id },
        });
        expect(untouched.priceGs).toBe(777000);
        const untouchedLot = await tx.lot.findUniqueOrThrow({ where: { id: other.lot.id } });
        expect(untouchedLot.exchangeRate.toNumber()).toBe(7000);
      });
    });

    it("returns field errors and writes nothing on invalid input", async () => {
      await withRollback(async (tx) => {
        const { lot } = await customLot(tx);
        const state = await saveLotParams(dbOver(tx), lot.id, { ...form, vatPercent: "250" });
        expect(state).toMatchObject({
          status: "error",
          fieldErrors: { vatPercent: expect.any(String) },
          values: { vatPercent: "250" },
        });
        const stored = await tx.lot.findUniqueOrThrow({ where: { id: lot.id } });
        expect(stored.vatRate.toNumber()).toBe(0.1);
      });
    });

    it("refuses a lot that follows the global parameters", async () => {
      await withRollback(async (tx) => {
        const { lot } = await createFixtureLot(tx, [
          { name: "A", originalValueUsd: 100, variants: [["M", 3, 3]] },
        ]);
        const state = await saveLotParams(dbOver(tx), lot.id, form);
        expect(state).toMatchObject({
          status: "error",
          message: "Esta marca sigue los Parámetros globales. Pasala a Propio para editarla acá.",
        });
        const stored = await tx.lot.findUniqueOrThrow({ where: { id: lot.id } });
        expect(stored.exchangeRate.toNumber()).toBe(7000);
      });
    });

    it.each(["not-a-uuid", UNKNOWN_LOT])(
      "returns an error for the unknown lot id %s",
      async (id) => {
        await withRollback(async (tx) => {
          const state = await saveLotParams(dbOver(tx), id, form);
          expect(state).toMatchObject({ status: "error", message: "No se encontró la marca." });
        });
      },
    );
  });

  describe("setLotPricingMode", () => {
    it("switching to custom keeps the current values and prices", async () => {
      await withRollback(async (tx) => {
        const { lot, products } = await createFixtureLot(tx, [
          { name: "A", originalValueUsd: 100, priceGs: 555000, variants: [["M", 3, 3]] },
        ]);
        const state = await setLotPricingMode(dbOver(tx), lot.id, "custom");
        expect(state).toEqual({
          status: "success",
          message: "La marca ahora usa parámetros propios. Parámetros ya no la modifica.",
        });
        const stored = await tx.lot.findUniqueOrThrow({ where: { id: lot.id } });
        expect(stored.pricingMode).toBe("custom");
        expect(stored.exchangeRate.toNumber()).toBe(7000);
        expect(stored.saleFactor.toNumber()).toBe(2.5);
        const product = await tx.product.findUniqueOrThrow({ where: { id: products[0]?.id } });
        expect(product.priceGs).toBe(555000);
      });
    });

    it("switching to global copies AppSettings into the lot and reprices it", async () => {
      await withRollback(async (tx) => {
        await tx.appSettings.upsert({
          where: { id: 1 },
          create: { id: 1, exchangeRate: 7450, saleFactor: 3, vatRate: 0.05, costRate: 0.6 },
          update: { exchangeRate: 7450, saleFactor: 3, vatRate: 0.05, costRate: 0.6 },
        });
        const { lot, products } = await customLot(tx);

        const state = await setLotPricingMode(dbOver(tx), lot.id, "global");
        expect(state).toEqual({
          status: "success",
          message: "La marca vuelve a seguir los Parámetros globales. Se recalculó 1 precio.",
        });
        const stored = await tx.lot.findUniqueOrThrow({ where: { id: lot.id } });
        expect(stored.pricingMode).toBe("global");
        expect(stored.exchangeRate.toNumber()).toBe(7450);
        expect(stored.saleFactor.toNumber()).toBe(3);
        expect(stored.vatRate.toNumber()).toBe(0.05);
        expect(stored.costRate.toNumber()).toBe(0.6);
        expect(stored.totalShippingUsd.toNumber()).toBe(20);
        const [expected] = priceLot(
          { exchangeRate: 7450, saleFactor: 3, vatRate: 0.05, costRate: 0.6, totalShippingUsd: 20 },
          [{ id: "x", originalValueUsd: 100, units: 3 }],
        );
        const product = await tx.product.findUniqueOrThrow({ where: { id: products[0]?.id } });
        expect(product.priceGs).toBe(expected?.priceGs);
      });
    });

    it("rejects an unknown mode and writes nothing", async () => {
      await withRollback(async (tx) => {
        const { lot } = await customLot(tx);
        const state = await setLotPricingMode(dbOver(tx), lot.id, "weird");
        expect(state).toMatchObject({ status: "error", message: "Elegí Global o Propio." });
        const stored = await tx.lot.findUniqueOrThrow({ where: { id: lot.id } });
        expect(stored.pricingMode).toBe("custom");
      });
    });

    it.each(["not-a-uuid", UNKNOWN_LOT])(
      "returns an error for the unknown lot id %s",
      async (id) => {
        await withRollback(async (tx) => {
          const state = await setLotPricingMode(dbOver(tx), id, "global");
          expect(state).toMatchObject({ status: "error", message: "No se encontró la marca." });
        });
      },
    );
  });
});
