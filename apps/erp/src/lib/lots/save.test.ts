import { afterAll, describe, expect, it } from "vitest";
import {
  createFixtureLot,
  dbOver,
  disconnectTestDb,
  hasDatabase,
  withRollback,
} from "../../test/db";
import { saveLotShipping } from "./save";

describe.skipIf(!hasDatabase)("saveLotShipping (database)", () => {
  afterAll(disconnectTestDb);

  it("saves only the shipping and leaves pricing params and product prices untouched", async () => {
    await withRollback(async (tx) => {
      const { lot } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 100, variants: [["M", 3, 3]] },
      ]);
      const before = await tx.lot.findUniqueOrThrow({ where: { id: lot.id } });
      const state = await saveLotShipping(dbOver(tx), lot.id, { totalShippingUsd: "45.5" });
      expect(state).toEqual({
        status: "success",
        message: "Envío guardado. Los precios se actualizan al aplicar desde Parámetros.",
      });
      const after = await tx.lot.findUniqueOrThrow({ where: { id: lot.id } });
      expect(after.totalShippingUsd.toNumber()).toBe(45.5);
      expect(after.exchangeRate).toEqual(before.exchangeRate);
      expect(after.saleFactor).toEqual(before.saleFactor);
      expect(after.vatRate).toEqual(before.vatRate);
      expect(after.costRate).toEqual(before.costRate);
      const product = await tx.product.findFirstOrThrow({ where: { lotId: lot.id } });
      expect(product.priceGs).toBe(1000);
    });
  });

  it("returns field errors and writes nothing on invalid input", async () => {
    await withRollback(async (tx) => {
      const { lot } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 100, variants: [["M", 3, 3]] },
      ]);
      const state = await saveLotShipping(dbOver(tx), lot.id, { totalShippingUsd: "-1" });
      expect(state).toMatchObject({
        status: "error",
        fieldErrors: { totalShippingUsd: expect.any(String) },
        values: { totalShippingUsd: "-1" },
      });
      const stored = await tx.lot.findUniqueOrThrow({ where: { id: lot.id } });
      expect(stored.totalShippingUsd.toNumber()).toBe(20);
    });
  });

  it.each(["not-a-uuid", "00000000-0000-7000-8000-000000000000"])(
    "returns an error for the unknown lot id %s",
    async (id) => {
      await withRollback(async (tx) => {
        const state = await saveLotShipping(dbOver(tx), id, { totalShippingUsd: "10" });
        expect(state).toMatchObject({ status: "error", message: "No se encontró el lote." });
      });
    },
  );
});
