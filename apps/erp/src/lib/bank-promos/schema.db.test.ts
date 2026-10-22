import { afterAll, describe, expect, it } from "vitest";
import { createFixtureLot, disconnectTestDb, hasDatabase, withRollback } from "../../test/db";

describe.skipIf(!hasDatabase)("bank promo schema (database)", () => {
  afterAll(disconnectTestDb);

  it("stores weekdays, window and cap and reads them back", async () => {
    await withRollback(async (tx) => {
      const bank = await tx.bank.create({ data: { name: "Banco schema test" } });
      const promo = await tx.bankPromo.create({
        data: {
          kind: "refund",
          value: 20,
          days: [1, 4],
          capGs: 200_000,
          startsAt: new Date("2030-01-01T00:00:00.000Z"),
          endsAt: new Date("2030-01-31T00:00:00.000Z"),
          scope: "all",
          banks: { create: [{ bankId: bank.id }] },
        },
      });
      const read = await tx.bankPromo.findUniqueOrThrow({ where: { id: promo.id } });
      expect(read).toMatchObject({ kind: "refund", value: 20, days: [1, 4], capGs: 200_000 });
      expect(read.startsAt?.toISOString()).toBe("2030-01-01T00:00:00.000Z");
      expect(read.isActive).toBe(true);
    });
  });

  it("keeps bank names unique", async () => {
    await withRollback(async (tx) => {
      await tx.bank.create({ data: { name: "Banco duplicado" } });
      await expect(tx.bank.create({ data: { name: "Banco duplicado" } })).rejects.toThrow();
    });
  });

  it("refuses to delete a bank used by a promo", async () => {
    await withRollback(async (tx) => {
      const bank = await tx.bank.create({ data: { name: "Banco en uso" } });
      await tx.bankPromo.create({
        data: {
          kind: "installments",
          value: 12,
          scope: "all",
          banks: { create: [{ bankId: bank.id }] },
        },
      });
      await expect(tx.bank.delete({ where: { id: bank.id } })).rejects.toThrow();
    });
  });

  it("removes a promo's links when the promo, a lot or a product is deleted", async () => {
    await withRollback(async (tx) => {
      const { lot, products } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 10, variants: [["M", 1, 1]] },
      ]);
      const bank = await tx.bank.create({ data: { name: "Banco cascada" } });
      const promo = await tx.bankPromo.create({
        data: {
          kind: "discount",
          value: 10,
          scope: "products",
          banks: { create: [{ bankId: bank.id }] },
          lots: { create: [{ lotId: lot.id }] },
          products: { create: [{ productId: products[0]?.id ?? "" }] },
        },
      });
      await tx.product.delete({ where: { id: products[0]?.id ?? "" } });
      expect(await tx.bankPromoProduct.count({ where: { promoId: promo.id } })).toBe(0);
      await tx.bankPromoLot.deleteMany({ where: { promoId: promo.id } });
      await tx.bankPromo.delete({ where: { id: promo.id } });
      expect(await tx.bankPromoBank.count({ where: { promoId: promo.id } })).toBe(0);
      await tx.bank.delete({ where: { id: bank.id } });
    });
  });
});
