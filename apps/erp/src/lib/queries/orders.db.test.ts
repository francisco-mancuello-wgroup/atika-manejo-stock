import { afterAll, describe, expect, it } from "vitest";
import { createFixtureLot, disconnectTestDb, hasDatabase, withRollback } from "../../test/db";
import { getOrderDetail, getOrders } from "./orders";

/** Two pieces: A (sizes M and S) and B (size U). Returns the variant ids by label. */
async function pieces(tx: Parameters<Parameters<typeof withRollback>[0]>[0]) {
  const { products } = await createFixtureLot(tx, [
    {
      name: "Blusa A",
      originalValueUsd: 10,
      priceGs: 100_000,
      variants: [
        ["M", 3, 3],
        ["S", 1, 0],
      ],
    },
    { name: "Saco B", originalValueUsd: 10, priceGs: 300_000, variants: [["U", 2, 2]] },
  ]);
  const [a, b] = products;
  const find = (p: typeof a, size: string) => p?.variants.find((v) => v.size === size);
  return { aM: find(a, "M"), aS: find(a, "S"), bU: find(b, "U"), productA: a };
}

const line = (variantId: string | undefined, quantity: number, unitPriceGs: number, over = {}) => ({
  variantId: variantId ?? "",
  quantity,
  unitPriceGs,
  discountPercent: null,
  productName: "Blusa A",
  size: "M",
  color: "Rojo",
  ...over,
});

describe.skipIf(!hasDatabase)("order queries (database)", () => {
  afterAll(disconnectTestDb);

  it("lists pending orders first, then decided ones newest first, with lines and total", async () => {
    await withRollback(async (tx) => {
      await tx.order.deleteMany();
      const { aM, bU } = await pieces(tx);
      const old = await tx.order.create({
        data: {
          status: "approved",
          createdAt: new Date("2030-01-01T12:00:00Z"),
          decidedAt: new Date("2030-01-02"),
          items: { create: [line(aM?.id, 1, 100_000)] },
        },
      });
      const newest = await tx.order.create({
        data: {
          status: "rejected",
          createdAt: new Date("2030-01-05T12:00:00Z"),
          decidedAt: new Date("2030-01-06"),
          items: { create: [line(aM?.id, 1, 100_000)] },
        },
      });
      const pending = await tx.order.create({
        data: {
          createdAt: new Date("2030-01-03T12:00:00Z"),
          items: {
            create: [
              line(aM?.id, 2, 90_000),
              line(bU?.id, 1, 300_000, { productName: "Saco B", size: "U" }),
            ],
          },
        },
      });

      const all = await getOrders(tx);
      expect(all.map((o) => o.id)).toEqual([pending.id, newest.id, old.id]);
      expect(all[0]).toMatchObject({
        number: pending.number,
        date: "2030-01-03",
        status: "pending",
        lineCount: 2,
        totalGs: 2 * 90_000 + 300_000,
      });

      expect((await getOrders(tx, "approved")).map((o) => o.id)).toEqual([old.id]);
      expect((await getOrders(tx, "pending")).map((o) => o.id)).toEqual([pending.id]);
    });
  });

  it("shows an order with the current stock of each size", async () => {
    await withRollback(async (tx) => {
      const { aM, aS, productA } = await pieces(tx);
      const order = await tx.order.create({
        data: {
          items: {
            create: [
              line(aM?.id, 2, 90_000, { discountPercent: 10 }),
              line(aS?.id, 1, 100_000, { size: "S", color: null }),
            ],
          },
        },
      });
      const detail = await getOrderDetail(order.id, tx);
      expect(detail).toMatchObject({
        id: order.id,
        number: order.number,
        status: "pending",
        decidedDate: null,
        totalGs: 280_000,
      });
      expect(detail?.items).toEqual([
        {
          id: expect.any(String),
          productId: productA?.id,
          productName: "Blusa A",
          size: "M",
          color: "Rojo",
          quantity: 2,
          unitPriceGs: 90_000,
          discountPercent: 10,
          subtotalGs: 180_000,
          stock: 3,
        },
        expect.objectContaining({ size: "S", color: null, subtotalGs: 100_000, stock: 0 }),
      ]);
    });
  });

  it("returns null for an unknown or malformed id", async () => {
    await withRollback(async (tx) => {
      expect(await getOrderDetail("00000000-0000-4000-8000-000000000000", tx)).toBeNull();
      expect(await getOrderDetail("nope", tx)).toBeNull();
    });
  });
});
