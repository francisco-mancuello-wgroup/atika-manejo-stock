import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient, type Prisma } from "./index";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const client = hasDatabase ? createPrismaClient(process.env.DATABASE_URL ?? "") : undefined;

class Rollback extends Error {}

async function withRollback(fn: (tx: Prisma.TransactionClient) => Promise<void>): Promise<void> {
  try {
    await client?.$transaction(async (tx) => {
      await fn(tx);
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
}

async function variantId(tx: Prisma.TransactionClient): Promise<string> {
  const supplier = await tx.supplier.create({ data: { name: "Order supplier" } });
  const lot = await tx.lot.create({
    data: {
      supplierId: supplier.id,
      name: "Order lot",
      purchasedAt: new Date("2026-01-15"),
      exchangeRate: 7000,
      saleFactor: 2.5,
      vatRate: 0.1,
      costRate: 1,
      totalShippingUsd: 0,
    },
  });
  const product = await tx.product.create({
    data: {
      lotId: lot.id,
      name: "ORDERED",
      originalValueUsd: 10,
      priceGs: 100000,
      variants: { create: [{ size: "M", unitsBought: 3, stock: 3 }] },
    },
    include: { variants: true },
  });
  return product.variants[0]?.id ?? "";
}

const line = (id: string) => ({
  variantId: id,
  quantity: 2,
  unitPriceGs: 90000,
  discountPercent: 10,
  productName: "ORDERED",
  size: "M",
  color: null,
});

describe.skipIf(!hasDatabase)("Order", () => {
  afterAll(async () => {
    await client?.$disconnect();
  });

  it("starts pending with an increasing human number", async () => {
    await withRollback(async (tx) => {
      const first = await tx.order.create({ data: {} });
      const second = await tx.order.create({ data: {} });
      expect(first.status).toBe("pending");
      expect(first.decidedAt).toBeNull();
      expect(second.number).toBeGreaterThan(first.number);
    });
  });

  it("keeps its lines and removes them with the order", async () => {
    await withRollback(async (tx) => {
      const id = await variantId(tx);
      const order = await tx.order.create({ data: { items: { create: [line(id)] } } });
      expect(await tx.orderItem.count({ where: { orderId: order.id } })).toBe(1);
      await tx.order.delete({ where: { id: order.id } });
      expect(await tx.orderItem.count({ where: { orderId: order.id } })).toBe(0);
    });
  });

  it("does not let a variant with ordered lines be deleted", async () => {
    await withRollback(async (tx) => {
      const id = await variantId(tx);
      await tx.order.create({ data: { items: { create: [line(id)] } } });
      await expect(tx.productVariant.delete({ where: { id } })).rejects.toThrow();
    });
  });

  it("links a sale to its order", async () => {
    await withRollback(async (tx) => {
      const id = await variantId(tx);
      const order = await tx.order.create({ data: {} });
      const sale = await tx.sale.create({
        data: {
          variantId: id,
          soldAt: new Date("2026-10-22"),
          listPriceGs: 100000,
          orderId: order.id,
        },
      });
      expect(sale.orderId).toBe(order.id);
      expect(
        (
          await tx.sale.create({
            data: { variantId: id, soldAt: new Date("2026-10-22"), listPriceGs: 100000 },
          })
        ).orderId,
      ).toBeNull();
    });
  });
});
