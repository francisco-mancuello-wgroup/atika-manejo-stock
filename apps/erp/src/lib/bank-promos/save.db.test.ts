import { afterAll, describe, expect, it } from "vitest";
import {
  createFixtureLot,
  dbOver,
  disconnectTestDb,
  hasDatabase,
  withRollback,
} from "../../test/db";
import { deleteBankPromo, saveBankPromo, setBankPromoActive } from "./save";

const base = { name: "Itaú jueves", kind: "refund", value: "20", scope: "all", isActive: "on" };

async function bank(tx: Parameters<Parameters<typeof withRollback>[0]>[0], name: string) {
  return (await tx.bank.create({ data: { name } })).id;
}

const idOf = (state: object) => ("promoId" in state ? String(state.promoId) : "");

describe.skipIf(!hasDatabase)("bank promo management (database)", () => {
  afterAll(disconnectTestDb);

  it("creates a promo for every product with its banks, days, cap and window", async () => {
    await withRollback(async (tx) => {
      const itau = await bank(tx, "Itaú promo test");
      const state = await saveBankPromo(
        dbOver(tx),
        null,
        {
          ...base,
          capGs: "200.000",
          startsAt: "2026-11-01",
          endsAt: "2026-11-30",
          terms: "Solo crédito.",
        },
        { bankIds: [itau], days: ["4", "1"], lotIds: [], productIds: [] },
      );
      expect(state).toMatchObject({ status: "success", promoId: expect.any(String) });
      const row = await tx.bankPromo.findUniqueOrThrow({
        where: { id: idOf(state) },
        include: { banks: true, lots: true, products: true },
      });
      expect(row).toMatchObject({
        name: "Itaú jueves",
        kind: "refund",
        value: 20,
        days: [1, 4],
        capGs: 200_000,
        terms: "Solo crédito.",
        isActive: true,
        scope: "all",
      });
      expect(row.startsAt?.toISOString()).toBe("2026-11-01T00:00:00.000Z");
      expect(row.endsAt?.toISOString()).toBe("2026-11-30T00:00:00.000Z");
      expect(row.banks.map((b) => b.bankId)).toEqual([itau]);
      expect(row.lots).toEqual([]);
      expect(row.products).toEqual([]);
    });
  });

  it("rejects a promo without a name and writes nothing", async () => {
    await withRollback(async (tx) => {
      const itau = await bank(tx, "Itaú sin nombre");
      const before = await tx.bankPromo.count();
      const state = await saveBankPromo(
        dbOver(tx),
        null,
        { ...base, name: "  " },
        { bankIds: [itau], days: [], lotIds: [], productIds: [] },
      );
      expect(state).toMatchObject({
        status: "error",
        fieldErrors: { name: "Poné un nombre para la promo." },
      });
      expect(await tx.bankPromo.count()).toBe(before);
    });
  });

  it("creates a lots promo and a products promo with their lists", async () => {
    await withRollback(async (tx) => {
      const { lot, products } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 10, variants: [["M", 1, 1]] },
      ]);
      const b = await bank(tx, "Banco listas");
      const lots = await saveBankPromo(
        dbOver(tx),
        null,
        { ...base, scope: "lots" },
        { bankIds: [b], days: [], lotIds: [lot.id], productIds: [] },
      );
      expect(
        (await tx.bankPromoLot.findMany({ where: { promoId: idOf(lots) } })).map((r) => r.lotId),
      ).toEqual([lot.id]);
      const prods = await saveBankPromo(
        dbOver(tx),
        null,
        { ...base, scope: "products" },
        { bankIds: [b], days: [], lotIds: [], productIds: [products[0]?.id ?? ""] },
      );
      expect(
        (await tx.bankPromoProduct.findMany({ where: { promoId: idOf(prods) } })).map(
          (r) => r.productId,
        ),
      ).toEqual([products[0]?.id]);
    });
  });

  it("replaces banks and lists on edit, and drops the lists when the scope changes", async () => {
    await withRollback(async (tx) => {
      const { lot, products } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 10, variants: [["M", 1, 1]] },
      ]);
      const b1 = await bank(tx, "Banco uno");
      const b2 = await bank(tx, "Banco dos");
      const created = await saveBankPromo(
        dbOver(tx),
        null,
        { ...base, scope: "lots" },
        { bankIds: [b1], days: ["1"], lotIds: [lot.id], productIds: [] },
      );
      const id = idOf(created);

      const edited = await saveBankPromo(
        dbOver(tx),
        id,
        {
          ...base,
          name: "Cuotas renombradas",
          kind: "installments",
          value: "6",
          scope: "products",
          capGs: "",
        },
        { bankIds: [b1, b2], days: [], lotIds: [], productIds: [products[0]?.id ?? ""] },
      );
      expect(edited).toMatchObject({ status: "success", message: "Promoción guardada." });
      const row = await tx.bankPromo.findUniqueOrThrow({
        where: { id },
        include: { banks: true, lots: true, products: true },
      });
      expect(row).toMatchObject({
        name: "Cuotas renombradas",
        kind: "installments",
        value: 6,
        days: [],
        capGs: null,
      });
      expect(row.banks.map((b) => b.bankId).sort()).toEqual([b1, b2].sort());
      expect(row.lots).toEqual([]);
      expect(row.products.map((p) => p.productId)).toEqual([products[0]?.id]);
    });
  });

  it("rejects invalid input and unknown banks without writing", async () => {
    await withRollback(async (tx) => {
      const before = await tx.bankPromo.count();
      const b = await bank(tx, "Banco inválido");
      const invalid = await saveBankPromo(
        dbOver(tx),
        null,
        { ...base, value: "500" },
        { bankIds: [b], days: [], lotIds: [], productIds: [] },
      );
      expect(invalid).toMatchObject({
        status: "error",
        fieldErrors: { value: expect.any(String) },
      });
      const unknown = await saveBankPromo(dbOver(tx), null, base, {
        bankIds: ["0190f3a0-0000-7000-8000-00000000dead"],
        days: [],
        lotIds: [],
        productIds: [],
      });
      expect(unknown).toMatchObject({
        status: "error",
        fieldErrors: { bankIds: "Elegí bancos que existan." },
      });
      expect(await tx.bankPromo.count()).toBe(before);
    });
  });

  it("reports a missing promo when editing one that does not exist", async () => {
    await withRollback(async (tx) => {
      const b = await bank(tx, "Banco sin promo");
      const state = await saveBankPromo(dbOver(tx), "0190f3a0-0000-7000-8000-00000000dead", base, {
        bankIds: [b],
        days: [],
        lotIds: [],
        productIds: [],
      });
      expect(state).toMatchObject({ status: "error", message: "No se encontró la promoción." });
    });
  });

  it("toggles the active flag", async () => {
    await withRollback(async (tx) => {
      const b = await bank(tx, "Banco toggle");
      const created = await saveBankPromo(dbOver(tx), null, base, {
        bankIds: [b],
        days: [],
        lotIds: [],
        productIds: [],
      });
      const id = idOf(created);
      expect(await setBankPromoActive(dbOver(tx), id, false)).toMatchObject({ status: "success" });
      expect((await tx.bankPromo.findUniqueOrThrow({ where: { id } })).isActive).toBe(false);
      expect(await setBankPromoActive(dbOver(tx), "bad", true)).toMatchObject({ status: "error" });
    });
  });

  it("deletes a promo and its links, keeping banks, lots and products", async () => {
    await withRollback(async (tx) => {
      const { lot } = await createFixtureLot(tx, [
        { name: "A", originalValueUsd: 10, variants: [["M", 1, 1]] },
      ]);
      const b = await bank(tx, "Banco borrar promo");
      const created = await saveBankPromo(
        dbOver(tx),
        null,
        { ...base, scope: "lots" },
        { bankIds: [b], days: [], lotIds: [lot.id], productIds: [] },
      );
      const id = idOf(created);
      expect(await deleteBankPromo(dbOver(tx), id)).toMatchObject({ status: "success" });
      expect(await tx.bankPromo.findUnique({ where: { id } })).toBeNull();
      expect(await tx.bankPromoBank.count({ where: { promoId: id } })).toBe(0);
      expect(await tx.bankPromoLot.count({ where: { promoId: id } })).toBe(0);
      expect(await tx.bank.findUnique({ where: { id: b } })).not.toBeNull();
      expect(await tx.lot.findUnique({ where: { id: lot.id } })).not.toBeNull();
      expect(await deleteBankPromo(dbOver(tx), id)).toMatchObject({ status: "error" });
    });
  });
});
