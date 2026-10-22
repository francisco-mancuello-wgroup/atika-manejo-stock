import type { Prisma } from "@atika/db";
import { afterAll, describe, expect, it } from "vitest";
import {
  createFixtureLot,
  dbOverSavepoint,
  disconnectTestDb,
  hasDatabase,
  withRollback,
} from "../../test/db";
import { approveOrder, rejectOrder } from "./decide";

const NOW = new Date("2026-10-22T15:00:00.000Z");

type Tx = Prisma.TransactionClient;

/** Piece A (M: 3 in stock, S: 1) at 100.000 and piece B (U: 2) at 300.000; no live discounts. */
async function setup(tx: Tx) {
  await tx.discount.updateMany({ data: { isActive: false } });
  await tx.publicationGroup.updateMany({ data: { isActive: false } });
  const { products } = await createFixtureLot(tx, [
    {
      name: "Blusa A",
      originalValueUsd: 10,
      priceGs: 100_000,
      variants: [
        ["M", 3, 3],
        ["S", 1, 1],
      ],
    },
    { name: "Saco B", originalValueUsd: 10, priceGs: 300_000, variants: [["U", 2, 2]] },
  ]);
  const variant = (index: number, size: string) => {
    const found = products[index]?.variants.find((v) => v.size === size);
    if (!found) throw new Error("fixture variant missing");
    return found;
  };
  return { aM: variant(0, "M"), aS: variant(0, "S"), bU: variant(1, "U"), products };
}

const line = (
  variant: { id: string },
  quantity: number,
  unitPriceGs: number,
  productName = "Blusa A",
  size = "M",
) => ({
  variantId: variant.id,
  quantity,
  unitPriceGs,
  discountPercent: null,
  productName,
  size,
  color: null,
});

const stockOf = async (tx: Tx, id: string) =>
  (await tx.productVariant.findUniqueOrThrow({ where: { id } })).stock;

describe.skipIf(!hasDatabase)("approveOrder (database)", () => {
  afterAll(disconnectTestDb);

  it("registers one sale per line, decrements stock and marks the order approved", async () => {
    await withRollback(async (tx) => {
      const { aM, bU } = await setup(tx);
      const order = await tx.order.create({
        data: {
          items: {
            create: [
              // Charged at today's list price: stored as "not overridden".
              line(aM, 2, 100_000),
              // The customer saw a discount that is no longer live: the order price is kept.
              line(bU, 1, 270_000, "Saco B", "U"),
            ],
          },
        },
      });

      const result = await approveOrder(dbOverSavepoint(tx), order.id, NOW);

      expect(result).toMatchObject({ ok: true, number: order.number, salesCount: 2 });
      const sales = await tx.sale.findMany({ where: { orderId: order.id } });
      expect(sales).toHaveLength(2);
      const bySize = (id: string) => sales.find((sale) => sale.variantId === id);
      expect(bySize(aM.id)).toMatchObject({
        quantity: 2,
        listPriceGs: 100_000,
        chargedGs: null,
        soldAt: new Date("2026-10-22T00:00:00.000Z"),
      });
      expect(bySize(bU.id)).toMatchObject({
        quantity: 1,
        listPriceGs: 300_000,
        chargedGs: 270_000,
      });
      expect(await stockOf(tx, aM.id)).toBe(1);
      expect(await stockOf(tx, bU.id)).toBe(1);
      const decided = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(decided.status).toBe("approved");
      expect(decided.decidedAt).toEqual(NOW);
    });
  });

  it("changes nothing when any line lacks stock, and says which one", async () => {
    await withRollback(async (tx) => {
      const { aM, aS, bU } = await setup(tx);
      const order = await tx.order.create({
        data: {
          items: {
            create: [
              line(aM, 1, 100_000),
              line(bU, 5, 300_000, "Saco B", "U"),
              line(aS, 1, 100_000, "Blusa A", "S"),
            ],
          },
        },
      });

      const result = await approveOrder(dbOverSavepoint(tx), order.id, NOW);

      expect(result).toMatchObject({
        ok: false,
        reason: "out_of_stock",
        number: order.number,
        line: { productName: "Saco B", size: "U", quantity: 5, available: 2 },
      });
      expect(await stockOf(tx, aM.id)).toBe(3);
      expect(await stockOf(tx, bU.id)).toBe(2);
      expect(await stockOf(tx, aS.id)).toBe(1);
      expect(await tx.sale.count({ where: { orderId: order.id } })).toBe(0);
      const same = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(same.status).toBe("pending");
      expect(same.decidedAt).toBeNull();
    });
  });

  it("cannot be approved twice: the second try registers nothing", async () => {
    await withRollback(async (tx) => {
      const { aM } = await setup(tx);
      const order = await tx.order.create({ data: { items: { create: [line(aM, 1, 100_000)] } } });
      const db = dbOverSavepoint(tx);
      expect((await approveOrder(db, order.id, NOW)).ok).toBe(true);
      expect(await approveOrder(db, order.id, NOW)).toMatchObject({
        ok: false,
        reason: "already_decided",
        status: "approved",
      });
      expect(await tx.sale.count({ where: { orderId: order.id } })).toBe(1);
      expect(await stockOf(tx, aM.id)).toBe(2);
    });
  });

  it("does not approve a rejected order", async () => {
    await withRollback(async (tx) => {
      const { aM } = await setup(tx);
      const order = await tx.order.create({ data: { items: { create: [line(aM, 1, 100_000)] } } });
      const db = dbOverSavepoint(tx);
      expect((await rejectOrder(db, order.id, NOW)).ok).toBe(true);
      expect(await approveOrder(db, order.id, NOW)).toMatchObject({
        ok: false,
        reason: "already_decided",
        status: "rejected",
      });
      expect(await stockOf(tx, aM.id)).toBe(3);
    });
  });

  it("reports an unknown or malformed id", async () => {
    await withRollback(async (tx) => {
      const db = dbOverSavepoint(tx);
      const missing = { ok: false, reason: "not_found" };
      expect(await approveOrder(db, "00000000-0000-4000-8000-000000000000", NOW)).toEqual(missing);
      expect(await approveOrder(db, "nope", NOW)).toEqual(missing);
      expect(await rejectOrder(db, "nope", NOW)).toEqual(missing);
    });
  });
});

describe.skipIf(!hasDatabase)("rejectOrder (database)", () => {
  afterAll(disconnectTestDb);

  it("marks the order rejected and leaves stock and sales alone", async () => {
    await withRollback(async (tx) => {
      const { aM } = await setup(tx);
      const order = await tx.order.create({ data: { items: { create: [line(aM, 2, 100_000)] } } });

      const result = await rejectOrder(dbOverSavepoint(tx), order.id, NOW);

      expect(result).toEqual({ ok: true, number: order.number });
      const decided = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(decided.status).toBe("rejected");
      expect(decided.decidedAt).toEqual(NOW);
      expect(await stockOf(tx, aM.id)).toBe(3);
      expect(await tx.sale.count({ where: { orderId: order.id } })).toBe(0);
    });
  });

  it("cannot reject an order that was already decided", async () => {
    await withRollback(async (tx) => {
      const { aM } = await setup(tx);
      const order = await tx.order.create({ data: { items: { create: [line(aM, 1, 100_000)] } } });
      const db = dbOverSavepoint(tx);
      await approveOrder(db, order.id, NOW);
      expect(await rejectOrder(db, order.id, NOW)).toMatchObject({
        ok: false,
        reason: "already_decided",
        status: "approved",
      });
      expect((await tx.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
        "approved",
      );
    });
  });
});
