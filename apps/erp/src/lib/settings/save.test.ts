import { priceLot } from "@atika/pricing";
import { afterAll, describe, expect, it } from "vitest";
import {
  createFixtureLot,
  dbOver,
  disconnectTestDb,
  hasDatabase,
  withRollback,
} from "../../test/db";
import { applySettingsToAllLots, saveAppSettings } from "./save";

const form = { exchangeRate: "7450", saleFactor: "3", vatPercent: "5", costPercent: "60" };

describe.skipIf(!hasDatabase)("app settings (database)", () => {
  afterAll(disconnectTestDb);

  it("saves the settings as fractions in the singleton row", async () => {
    await withRollback(async (tx) => {
      const state = await saveAppSettings(dbOver(tx), form);
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
      const state = await saveAppSettings(dbOver(tx), { ...form, vatPercent: "250" });
      expect(state).toMatchObject({
        status: "error",
        fieldErrors: { vatPercent: expect.any(String) },
      });
      expect(await tx.appSettings.findUnique({ where: { id: 1 } })).toEqual(before);
    });
  });

  it("applies factor and IVA to every lot and reprices all of them", async () => {
    await withRollback(async (tx) => {
      await saveAppSettings(dbOver(tx), form);
      const a = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 100, variants: [["M", 3, 3]] },
      ]);
      const b = await createFixtureLot(tx, [
        { name: "B", originalValueUsd: 40, variants: [["U", 2, 2]] },
      ]);

      const state = await applySettingsToAllLots(dbOver(tx));
      expect(state.status).toBe("success");

      for (const [{ lot, products }, units, value] of [
        [a, 3, 100],
        [b, 2, 40],
      ] as const) {
        const stored = await tx.lot.findUniqueOrThrow({ where: { id: lot.id } });
        expect(stored.saleFactor.toNumber()).toBe(3);
        expect(stored.vatRate.toNumber()).toBe(0.05);
        // Exchange rate, cost rate and shipping stay as the lot had them.
        expect(stored.exchangeRate.toNumber()).toBe(7000);
        expect(stored.costRate.toNumber()).toBe(0.5);
        const [expected] = priceLot(
          {
            exchangeRate: 7000,
            saleFactor: 3,
            vatRate: 0.05,
            costRate: 0.5,
            totalShippingUsd: 20,
          },
          [{ id: "x", originalValueUsd: value, units }],
        );
        const product = await tx.product.findUniqueOrThrow({ where: { id: products[0]?.id } });
        expect(product.priceGs).toBe(expected?.priceGs);
      }
    });
  });
});
