import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient, type Prisma } from "../src/index";
import { applyGroup } from "./group";

const hasDatabase = Boolean(process.env.DATABASE_URL);

class Rollback extends Error {}

const client = hasDatabase ? createPrismaClient(process.env.DATABASE_URL ?? "") : undefined;

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

async function fixture(tx: Prisma.TransactionClient) {
  const supplier = await tx.supplier.create({ data: { name: "Group seed supplier" } });
  const lot = await tx.lot.create({
    data: {
      supplierId: supplier.id,
      name: "Group seed lot",
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
      name: "MAYA",
      originalValueUsd: 10,
      priceGs: 100000,
      variants: {
        create: [
          { size: "S", unitsBought: 5, stock: 5 },
          { size: "M", unitsBought: 2, stock: 2 },
          { size: "L", unitsBought: 1, stock: 1 },
        ],
      },
    },
    include: { variants: true },
  });
  return { lot, product };
}

const rows = [
  { name: "maya", size: "S", stock: 9 },
  { name: "MAYA", size: "M", stock: 2 },
  { name: "MAYA", size: "L", stock: 0 },
  { name: "GHOST", size: "S", stock: 1 },
];

describe.skipIf(!hasDatabase)("applyGroup (database)", () => {
  afterAll(async () => {
    await client?.$disconnect();
  });

  it("allocates capped stock, skips zero rows, lists unmatched and never writes stock", async () => {
    await withRollback(async (tx) => {
      const { lot, product } = await fixture(tx);
      const summary = await applyGroup(tx, { name: "Pink test", lotName: lot.name, rows });
      expect(summary).toMatchObject({ matched: 2, units: 7, zeroRows: 1 });
      expect(summary.unmatched).toEqual([{ name: "GHOST", size: "S" }]);
      const group = await tx.publicationGroup.findFirstOrThrow({
        where: { name: "Pink test" },
        include: { allocations: true },
      });
      expect(group.isActive).toBe(false);
      expect(group.allocations.map((a) => a.allocated).sort()).toEqual([2, 5]);
      const variants = await tx.productVariant.findMany({ where: { productId: product.id } });
      expect(variants.map((v) => v.stock).sort()).toEqual([1, 2, 5]);
    });
  });

  it("is idempotent, keeps isActive and never lowers below sold", async () => {
    await withRollback(async (tx) => {
      const { lot, product } = await fixture(tx);
      const input = { name: "Pink test", lotName: lot.name, rows };
      await applyGroup(tx, input);
      const group = await tx.publicationGroup.findFirstOrThrow({ where: { name: "Pink test" } });
      await tx.publicationGroup.update({ where: { id: group.id }, data: { isActive: true } });
      const s = product.variants.find((v) => v.size === "S");
      await tx.groupAllocation.update({
        where: { groupId_variantId: { groupId: group.id, variantId: s?.id ?? "" } },
        data: { sold: 4 },
      });
      await applyGroup(tx, { ...input, rows: [{ name: "MAYA", size: "S", stock: 1 }] });
      expect(await tx.publicationGroup.count({ where: { name: "Pink test" } })).toBe(1);
      expect(await tx.groupAllocation.count({ where: { groupId: group.id } })).toBe(2);
      const after = await tx.groupAllocation.findFirstOrThrow({
        where: { groupId: group.id, variantId: s?.id },
      });
      expect(after.allocated).toBe(4);
      expect(
        (await tx.publicationGroup.findUniqueOrThrow({ where: { id: group.id } })).isActive,
      ).toBe(true);
    });
  });
});
