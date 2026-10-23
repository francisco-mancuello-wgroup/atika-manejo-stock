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

async function productId(tx: Prisma.TransactionClient): Promise<string> {
  const supplier = await tx.supplier.create({ data: { name: "Focus supplier" } });
  const lot = await tx.lot.create({
    data: {
      supplierId: supplier.id,
      name: "Focus lot",
      purchasedAt: new Date("2026-01-15"),
      exchangeRate: 7000,
      saleFactor: 2.5,
      vatRate: 0.1,
      costRate: 1,
      totalShippingUsd: 0,
    },
  });
  const product = await tx.product.create({
    data: { lotId: lot.id, name: "FOCUS", originalValueUsd: 10, priceGs: 100000 },
  });
  return product.id;
}

describe.skipIf(!hasDatabase)("ProductImage focal point", () => {
  afterAll(async () => {
    await client?.$disconnect();
  });

  it("defaults to the center of the photo", async () => {
    await withRollback(async (tx) => {
      const image = await tx.productImage.create({
        data: { productId: await productId(tx), url: "/a.jpg", position: 0 },
      });
      expect([image.focusX, image.focusY]).toEqual([50, 50]);
    });
  });

  it("stores a chosen point", async () => {
    await withRollback(async (tx) => {
      const image = await tx.productImage.create({
        data: {
          productId: await productId(tx),
          url: "/a.jpg",
          position: 0,
          focusX: 20,
          focusY: 80,
        },
      });
      expect([image.focusX, image.focusY]).toEqual([20, 80]);
    });
  });

  it("rejects a point outside 0-100", async () => {
    const data = { url: "/a.jpg", position: 0 };
    await expect(
      withRollback(async (tx) => {
        await tx.productImage.create({
          data: { ...data, productId: await productId(tx), focusX: 101 },
        });
      }),
    ).rejects.toThrow();
    await expect(
      withRollback(async (tx) => {
        await tx.productImage.create({
          data: { ...data, productId: await productId(tx), focusY: -1 },
        });
      }),
    ).rejects.toThrow();
  });
});
