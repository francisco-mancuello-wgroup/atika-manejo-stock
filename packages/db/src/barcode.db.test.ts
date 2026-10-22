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
  const supplier = await tx.supplier.create({ data: { name: "Barcode supplier" } });
  const lot = await tx.lot.create({
    data: {
      supplierId: supplier.id,
      name: "Barcode lot",
      purchasedAt: new Date("2026-01-15"),
      exchangeRate: 7000,
      saleFactor: 2.5,
      vatRate: 0.1,
      costRate: 1,
      totalShippingUsd: 0,
    },
  });
  const product = await tx.product.create({
    data: { lotId: lot.id, name: "BARCODE", originalValueUsd: 10, priceGs: 100000 },
  });
  return product.id;
}

const CODE = /^AT\d{6,}$/;

describe.skipIf(!hasDatabase)("ProductVariant.barcode", () => {
  afterAll(async () => {
    await client?.$disconnect();
  });

  it("assigns an opaque AT code to every new variant, whatever the creation path", async () => {
    await withRollback(async (tx) => {
      const id = await productId(tx);
      const nested = await tx.product.update({
        where: { id },
        data: { variants: { create: [{ size: "S", unitsBought: 1, stock: 1 }] } },
        include: { variants: true },
      });
      const direct = await tx.productVariant.create({
        data: { productId: id, size: "M", unitsBought: 2, stock: 2 },
      });
      expect(nested.variants[0]?.barcode).toMatch(CODE);
      expect(direct.barcode).toMatch(CODE);
      expect(direct.barcode).not.toBe(nested.variants[0]?.barcode);
    });
  });

  it("issues increasing codes that are never reused after a delete", async () => {
    await withRollback(async (tx) => {
      const id = await productId(tx);
      const first = await tx.productVariant.create({
        data: { productId: id, size: "S", unitsBought: 1, stock: 1 },
      });
      await tx.productVariant.delete({ where: { id: first.id } });
      const second = await tx.productVariant.create({
        data: { productId: id, size: "S", unitsBought: 1, stock: 1 },
      });
      expect(Number(second.barcode.slice(2))).toBeGreaterThan(Number(first.barcode.slice(2)));
    });
  });

  it("rejects a duplicated barcode", async () => {
    await withRollback(async (tx) => {
      const id = await productId(tx);
      const a = await tx.productVariant.create({
        data: { productId: id, size: "S", unitsBought: 1, stock: 1 },
      });
      await expect(
        tx.productVariant.create({
          data: { productId: id, size: "M", unitsBought: 1, stock: 1, barcode: a.barcode },
        }),
      ).rejects.toThrow();
    });
  });

  it("backfilled every existing variant with a distinct code", async () => {
    const rows = (await client?.productVariant.findMany({ select: { barcode: true } })) ?? [];
    for (const row of rows) expect(row.barcode).toMatch(CODE);
    expect(new Set(rows.map((r) => r.barcode)).size).toBe(rows.length);
  });
});
