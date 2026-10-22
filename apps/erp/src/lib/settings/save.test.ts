import { priceLot } from "@atika/pricing";
import { afterAll, describe, expect, it } from "vitest";
import {
  createFixtureLot,
  dbOver,
  disconnectTestDb,
  hasDatabase,
  withRollback,
} from "../../test/db";
import { saveAndApplySettings } from "./save";

const form = { exchangeRate: "7450", saleFactor: "3", vatPercent: "5", costPercent: "60" };

describe.skipIf(!hasDatabase)("app settings (database)", () => {
  afterAll(disconnectTestDb);

  it("saves the settings as fractions in the singleton row", async () => {
    await withRollback(async (tx) => {
      const state = await saveAndApplySettings(dbOver(tx), form);
      expect(state).toMatchObject({ status: "success" });
      const row = await tx.appSettings.findUniqueOrThrow({ where: { id: 1 } });
      expect(row.exchangeRate.toNumber()).toBe(7450);
      expect(row.saleFactor.toNumber()).toBe(3);
      expect(row.vatRate.toNumber()).toBe(0.05);
      expect(row.costRate.toNumber()).toBe(0.6);
    });
  });

  it("returns field errors and writes nothing on invalid input", async () => {
    await withRollback(async (tx) => {
      const before = await tx.appSettings.findUnique({ where: { id: 1 } });
      const state = await saveAndApplySettings(dbOver(tx), { ...form, vatPercent: "250" });
      expect(state).toMatchObject({
        status: "error",
        fieldErrors: { vatPercent: expect.any(String) },
      });
      expect(await tx.appSettings.findUnique({ where: { id: 1 } })).toEqual(before);
    });
  });

  it("applies every pricing parameter to every lot, keeping each lot's own shipping", async () => {
    await withRollback(async (tx) => {
      const a = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 100, variants: [["M", 3, 3]] },
      ]);
      const b = await createFixtureLot(tx, [
        { name: "B", originalValueUsd: 40, variants: [["U", 2, 2]] },
      ]);
      await tx.lot.update({ where: { id: b.lot.id }, data: { totalShippingUsd: 8 } });
      const lotCount = await tx.lot.count();
      const productCount = await tx.product.count();

      const state = await saveAndApplySettings(dbOver(tx), form);
      expect(state).toEqual({
        status: "success",
        message: `Parámetros guardados. Se actualizaron ${lotCount} lotes y se recalcularon ${productCount} precios.`,
      });
      for (const [{ lot, products }, shipping, value, units] of [
        [a, 20, 100, 3],
        [b, 8, 40, 2],
      ] as const) {
        const stored = await tx.lot.findUniqueOrThrow({ where: { id: lot.id } });
        expect(stored.saleFactor.toNumber()).toBe(3);
        expect(stored.vatRate.toNumber()).toBe(0.05);
        expect(stored.exchangeRate.toNumber()).toBe(7450);
        expect(stored.costRate.toNumber()).toBe(0.6);
        expect(stored.totalShippingUsd.toNumber()).toBe(shipping);
        const [expected] = priceLot(
          {
            exchangeRate: 7450,
            saleFactor: 3,
            vatRate: 0.05,
            costRate: 0.6,
            totalShippingUsd: shipping,
          },
          [{ id: "x", originalValueUsd: value, units }],
        );
        const product = await tx.product.findUniqueOrThrow({ where: { id: products[0]?.id } });
        expect(product.priceGs).toBe(expected?.priceGs);
      }
    });
  });

  it("leaves lots with their own parameters untouched and says so", async () => {
    await withRollback(async (tx) => {
      const own = await createFixtureLot(tx, [
        { name: "Own", originalValueUsd: 100, priceGs: 1234000, variants: [["M", 3, 3]] },
      ]);
      await tx.lot.update({ where: { id: own.lot.id }, data: { pricingMode: "custom" } });
      const followsGlobal = await createFixtureLot(tx, [
        { name: "Global", originalValueUsd: 100, variants: [["M", 3, 3]] },
      ]);
      const customCount = await tx.lot.count({ where: { pricingMode: "custom" } });
      const globalCount = await tx.lot.count({ where: { pricingMode: "global" } });
      const productCount = await tx.product.count({ where: { lot: { pricingMode: "global" } } });

      const state = await saveAndApplySettings(dbOver(tx), form);
      expect(state).toEqual({
        status: "success",
        message: `Parámetros guardados. Se actualizaron ${globalCount} lotes y se recalcularon ${productCount} precios. ${customCount === 1 ? "1 lote con parámetros propios no se modificó." : `${customCount} lotes con parámetros propios no se modificaron.`}`,
      });

      const storedOwn = await tx.lot.findUniqueOrThrow({ where: { id: own.lot.id } });
      expect(storedOwn.exchangeRate.toNumber()).toBe(7000);
      expect(storedOwn.saleFactor.toNumber()).toBe(2.5);
      expect(storedOwn.vatRate.toNumber()).toBe(0.1);
      expect(storedOwn.costRate.toNumber()).toBe(0.5);
      const ownProduct = await tx.product.findUniqueOrThrow({ where: { id: own.products[0]?.id } });
      expect(ownProduct.priceGs).toBe(1234000);

      const storedGlobal = await tx.lot.findUniqueOrThrow({ where: { id: followsGlobal.lot.id } });
      expect(storedGlobal.saleFactor.toNumber()).toBe(3);
    });
  });

  it("ignores a scope field sent by an old client", async () => {
    await withRollback(async (tx) => {
      const a = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 100, variants: [["M", 3, 3]] },
      ]);
      await saveAndApplySettings(dbOver(tx), { ...form, scope: "new" });
      const stored = await tx.lot.findUniqueOrThrow({ where: { id: a.lot.id } });
      expect(stored.saleFactor.toNumber()).toBe(3);
    });
  });
});
