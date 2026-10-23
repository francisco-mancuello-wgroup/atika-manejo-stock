import { afterAll, describe, expect, it } from "vitest";
import { createFixtureLot, disconnectTestDb, hasDatabase, withRollback } from "../../test/db";
import { getBankPromoForEdit, getBankPromoList, getLotOptions } from "./bank-promos";

describe.skipIf(!hasDatabase)("bank promo queries (database)", () => {
  afterAll(disconnectTestDb);

  it("lists promos newest first with banks, window and scope counts", async () => {
    await withRollback(async (tx) => {
      const { lot, products } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 10, variants: [["M", 1, 1]] },
        { name: "B", originalValueUsd: 10, variants: [["M", 1, 1]] },
      ]);
      const itau = await tx.bank.create({ data: { name: "Itaú list", logoUrl: "/l.webp" } });
      const conti = await tx.bank.create({ data: { name: "Continental list" } });
      await tx.bankPromo.create({
        data: {
          kind: "installments",
          value: 12,
          scope: "all",
          createdAt: new Date("2031-01-01"),
          banks: { create: [{ bankId: itau.id }] },
        },
      });
      const newest = await tx.bankPromo.create({
        data: {
          name: "Reintegro jueves",
          kind: "refund",
          value: 20,
          days: [4],
          capGs: 200_000,
          scope: "products",
          isActive: false,
          startsAt: new Date("2031-02-01T00:00:00.000Z"),
          endsAt: new Date("2031-02-10T00:00:00.000Z"),
          createdAt: new Date("2031-01-02"),
          banks: { create: [{ bankId: conti.id }, { bankId: itau.id }] },
          products: { create: products.map((p) => ({ productId: p.id })) },
          lots: { create: [{ lotId: lot.id }] },
        },
      });
      const list = await getBankPromoList(tx);
      expect(list[0]).toEqual({
        id: newest.id,
        name: "Reintegro jueves",
        kind: "refund",
        value: 20,
        days: [4],
        capGs: 200_000,
        isActive: false,
        scope: "products",
        startsAt: "2031-02-01",
        endsAt: "2031-02-10",
        lotCount: 1,
        productCount: 2,
        banks: [
          { id: conti.id, name: "Continental list", logoUrl: null },
          { id: itau.id, name: "Itaú list", logoUrl: "/l.webp" },
        ],
      });
      expect(list[1]).toMatchObject({
        name: null,
        kind: "installments",
        startsAt: null,
        productCount: 0,
      });
    });
  });

  it("reads one promo for editing with its lists, or null", async () => {
    await withRollback(async (tx) => {
      const { lot, products } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 10, variants: [["M", 1, 1]] },
      ]);
      const bank = await tx.bank.create({ data: { name: "Banco edit" } });
      const promo = await tx.bankPromo.create({
        data: {
          name: "Descuento Banco edit",
          kind: "discount",
          value: 15,
          days: [1, 4],
          terms: "Bases.",
          scope: "lots",
          banks: { create: [{ bankId: bank.id }] },
          lots: { create: [{ lotId: lot.id }] },
          products: { create: [{ productId: products[0]?.id ?? "" }] },
        },
      });
      expect(await getBankPromoForEdit(tx, promo.id)).toEqual({
        id: promo.id,
        name: "Descuento Banco edit",
        kind: "discount",
        value: 15,
        days: [1, 4],
        capGs: null,
        isActive: true,
        scope: "lots",
        startsAt: null,
        endsAt: null,
        terms: "Bases.",
        bankIds: [bank.id],
        lotIds: [lot.id],
        productIds: [products[0]?.id],
      });
      expect(await getBankPromoForEdit(tx, "0190f3a0-0000-7000-8000-00000000dead")).toBeNull();
      expect(await getBankPromoForEdit(tx, "not-a-uuid")).toBeNull();
    });
  });

  it("lists lots with their product count for the scope checklist", async () => {
    await withRollback(async (tx) => {
      const { lot } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 10, variants: [["M", 1, 1]] },
        { name: "B", originalValueUsd: 10, variants: [["M", 1, 1]] },
      ]);
      const found = (await getLotOptions(tx)).find((option) => option.id === lot.id);
      expect(found).toEqual({ id: lot.id, name: lot.name, productCount: 2 });
    });
  });
});
