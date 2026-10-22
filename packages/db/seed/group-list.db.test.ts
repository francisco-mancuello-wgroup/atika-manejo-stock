import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient, type Prisma } from "../src/index";
import { applyGroupList, type StockLine } from "./group-list";

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
  const supplier = await tx.supplier.create({ data: { name: "Group list supplier" } });
  const lotData = {
    supplierId: supplier.id,
    purchasedAt: new Date("2026-01-15"),
    exchangeRate: 7000,
    saleFactor: 2.5,
    vatRate: 0.1,
    costRate: 1,
    totalShippingUsd: 0,
  };
  const lotA = await tx.lot.create({ data: { ...lotData, name: "GL lot A" } });
  const lotB = await tx.lot.create({ data: { ...lotData, name: "GL lot B" } });
  const make = (lotId: string, name: string, code: string, sizes: [string, number][]) =>
    tx.product.create({
      data: {
        lotId,
        name,
        code,
        originalValueUsd: 10,
        priceGs: 100000,
        variants: {
          create: sizes.map(([size, stock]) => ({ size, unitsBought: stock, stock })),
        },
      },
      include: { variants: true },
    });
  const maya = await make(lotA.id, "MAYA GL", "GLMAYA", [
    ["S", 5],
    ["M", 2],
    ["L", 1],
  ]);
  const lia = await make(lotB.id, "LIA GL", "GLLIA", [["U", 3]]);
  return { maya, lia };
}

const line = (description: string, size: string, qty: number, row = 2): StockLine => ({
  description,
  size,
  qty,
  row,
});

const variantId = (product: { variants: { id: string; size: string }[] }, size: string) =>
  product.variants.find((v) => v.size === size)?.id ?? "";

describe.skipIf(!hasDatabase)("applyGroupList (database)", () => {
  afterAll(async () => {
    await client?.$disconnect();
  });

  it("creates the group, caps by stock, matches by code or name across lots, never writes stock", async () => {
    await withRollback(async (tx) => {
      const { maya, lia } = await fixture(tx);
      const summary = await applyGroupList(tx, {
        name: "GL group",
        lines: [
          line("maya gl", "S", 9), // name, qty > stock -> capped to 5
          line("GLMAYA", "M", 1), // code
          line("GLLIA", "U", 2), // other lot
        ],
      });
      expect(summary).toMatchObject({
        matched: 3,
        units: 8,
        capped: 1,
        removed: 0,
        keptForHistory: 0,
        dryRun: false,
      });
      const group = await tx.publicationGroup.findFirstOrThrow({
        where: { name: "GL group" },
        include: { allocations: true },
      });
      expect(group.isActive).toBe(false);
      const byVariant = new Map(group.allocations.map((a) => [a.variantId, a.allocated]));
      expect(byVariant.get(variantId(maya, "S"))).toBe(5);
      expect(byVariant.get(variantId(maya, "M"))).toBe(1);
      expect(byVariant.get(variantId(lia, "U"))).toBe(2);
      const stocks = await tx.productVariant.findMany({
        where: { id: { in: [...maya.variants, ...lia.variants].map((v) => v.id) } },
      });
      expect(stocks.map((v) => v.stock).sort()).toEqual([1, 2, 3, 5]);
    });
  });

  it("replaces: deletes unsold leftovers, keeps sold ones at sold, keeps isActive", async () => {
    await withRollback(async (tx) => {
      const { maya } = await fixture(tx);
      const group = await tx.publicationGroup.create({
        data: { name: "GL group", isActive: true },
      });
      const alloc = (size: string, allocated: number, sold: number) =>
        tx.groupAllocation.create({
          data: { groupId: group.id, variantId: variantId(maya, size), allocated, sold },
        });
      await alloc("S", 5, 2); // listed with qty 1 -> never below sold
      await alloc("M", 2, 0); // not listed, unsold -> deleted
      await alloc("L", 4, 1); // not listed, sold -> allocated = sold
      const summary = await applyGroupList(tx, {
        name: "GL group",
        lines: [line("MAYA GL", "S", 1)],
      });
      expect(summary).toMatchObject({ matched: 1, units: 2, removed: 1, keptForHistory: 1 });
      const after = await tx.groupAllocation.findMany({ where: { groupId: group.id } });
      const get = (size: string) => after.find((a) => a.variantId === variantId(maya, size));
      expect(get("S")).toMatchObject({ allocated: 2, sold: 2 });
      expect(get("M")).toBeUndefined();
      expect(get("L")).toMatchObject({ allocated: 1, sold: 1 });
      expect(
        (await tx.publicationGroup.findUniqueOrThrow({ where: { id: group.id } })).isActive,
      ).toBe(true);
      expect(await tx.publicationGroup.count({ where: { name: "GL group" } })).toBe(1);
    });
  });

  it("writes nothing and lists every problem when any line cannot be resolved", async () => {
    await withRollback(async (tx) => {
      await fixture(tx);
      const call = applyGroupList(tx, {
        name: "GL group",
        lines: [line("MAYA GL", "S", 1, 2), line("GHOST", "S", 1, 3), line("MAYA GL", "XL", 1, 4)],
      });
      await expect(call).rejects.toThrow(/GHOST[\s\S]*XL/);
      expect(await tx.publicationGroup.count({ where: { name: "GL group" } })).toBe(0);
    });
  });

  it("dry run reports the plan without writing", async () => {
    await withRollback(async (tx) => {
      const { maya } = await fixture(tx);
      const summary = await applyGroupList(tx, {
        name: "GL group",
        dryRun: true,
        lines: [line("MAYA GL", "S", 9)],
      });
      expect(summary).toMatchObject({ matched: 1, units: 5, capped: 1, dryRun: true });
      expect(await tx.publicationGroup.count({ where: { name: "GL group" } })).toBe(0);
      expect(await tx.groupAllocation.count({ where: { variantId: variantId(maya, "S") } })).toBe(
        0,
      );
    });
  });
});
