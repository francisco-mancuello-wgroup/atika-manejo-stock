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

  it("applies factor and IVA to the selected lots only, keeping their own rates", async () => {
    await withRollback(async (tx) => {
      const a = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 100, variants: [["M", 3, 3]] },
      ]);
      const b = await createFixtureLot(tx, [
        { name: "B", originalValueUsd: 40, variants: [["U", 2, 2]] },
      ]);

      const state = await saveAndApplySettings(dbOver(tx), { ...form, scope: "selected" }, [
        a.lot.id,
      ]);
      expect(state).toEqual({
        status: "success",
        message: "Parámetros guardados. Se actualizó 1 lote y se recalculó 1 precio.",
      });

      const stored = await tx.lot.findUniqueOrThrow({ where: { id: a.lot.id } });
      expect(stored.saleFactor.toNumber()).toBe(3);
      expect(stored.vatRate.toNumber()).toBe(0.05);
      // Exchange rate, cost rate and shipping stay as the lot had them.
      expect(stored.exchangeRate.toNumber()).toBe(7000);
      expect(stored.costRate.toNumber()).toBe(0.5);
      expect(stored.totalShippingUsd.toNumber()).toBe(20);
      const [expected] = priceLot(
        { exchangeRate: 7000, saleFactor: 3, vatRate: 0.05, costRate: 0.5, totalShippingUsd: 20 },
        [{ id: "x", originalValueUsd: 100, units: 3 }],
      );
      const product = await tx.product.findUniqueOrThrow({ where: { id: a.products[0]?.id } });
      expect(product.priceGs).toBe(expected?.priceGs);

      const untouched = await tx.lot.findUniqueOrThrow({ where: { id: b.lot.id } });
      expect(untouched.saleFactor.toNumber()).toBe(2.5);
      expect(untouched.vatRate.toNumber()).toBe(0.1);
      const untouchedProduct = await tx.product.findUniqueOrThrow({
        where: { id: b.products[0]?.id },
      });
      expect(untouchedProduct.priceGs).toBe(1000);
    });
  });

  it("applies factor and IVA to every lot when the scope is all", async () => {
    await withRollback(async (tx) => {
      const a = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 100, variants: [["M", 3, 3]] },
      ]);
      const b = await createFixtureLot(tx, [
        { name: "B", originalValueUsd: 40, variants: [["U", 2, 2]] },
      ]);
      const lotCount = await tx.lot.count();
      const productCount = await tx.product.count();

      const state = await saveAndApplySettings(dbOver(tx), { ...form, scope: "all" }, []);
      expect(state).toEqual({
        status: "success",
        message: `Parámetros guardados. Se actualizaron ${lotCount} lotes y se recalcularon ${productCount} precios.`,
      });
      for (const { lot } of [a, b]) {
        const stored = await tx.lot.findUniqueOrThrow({ where: { id: lot.id } });
        expect(stored.saleFactor.toNumber()).toBe(3);
        expect(stored.vatRate.toNumber()).toBe(0.05);
      }
    });
  });

  it("only saves the defaults when the scope is new lots", async () => {
    await withRollback(async (tx) => {
      const a = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 100, variants: [["M", 3, 3]] },
      ]);
      const state = await saveAndApplySettings(dbOver(tx), { ...form, scope: "new" }, [a.lot.id]);
      expect(state).toEqual({ status: "success", message: "Parámetros guardados." });
      const stored = await tx.lot.findUniqueOrThrow({ where: { id: a.lot.id } });
      expect(stored.saleFactor.toNumber()).toBe(2.5);
    });
  });

  it("requires a lot for the selected scope and writes nothing", async () => {
    await withRollback(async (tx) => {
      const before = await tx.appSettings.findUnique({ where: { id: 1 } });
      const state = await saveAndApplySettings(dbOver(tx), { ...form, scope: "selected" }, []);
      expect(state).toMatchObject({
        status: "error",
        fieldErrors: { lotIds: "Elegí al menos un lote." },
      });
      expect(await tx.appSettings.findUnique({ where: { id: 1 } })).toEqual(before);
    });
  });

  it("rejects unknown lot ids and writes nothing", async () => {
    await withRollback(async (tx) => {
      const a = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 100, variants: [["M", 3, 3]] },
      ]);
      const before = await tx.appSettings.findUnique({ where: { id: 1 } });
      const state = await saveAndApplySettings(dbOver(tx), { ...form, scope: "selected" }, [
        a.lot.id,
        "0198a1b2-0000-7000-8000-00000000ffff",
      ]);
      expect(state).toMatchObject({ status: "error", fieldErrors: { lotIds: expect.any(String) } });
      expect(await tx.appSettings.findUnique({ where: { id: 1 } })).toEqual(before);
      const stored = await tx.lot.findUniqueOrThrow({ where: { id: a.lot.id } });
      expect(stored.saleFactor.toNumber()).toBe(2.5);
    });
  });
});
