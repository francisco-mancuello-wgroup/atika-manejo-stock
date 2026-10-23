import { afterAll, describe, expect, it } from "vitest";
import { ensureBrand, FALLBACK_BRAND_SLUG } from "./brands";
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

describe.skipIf(!hasDatabase)("brands (database)", () => {
  afterAll(async () => {
    await client?.$disconnect();
  });

  it("keeps exactly one fallback brand, active, after every other brand", async () => {
    await withRollback(async (tx) => {
      const all = await tx.brand.findMany({ orderBy: { position: "asc" } });
      const fallbacks = all.filter((brand) => brand.isFallback);
      expect(fallbacks).toHaveLength(1);
      expect(fallbacks[0]).toMatchObject({ name: "Otras marcas", slug: FALLBACK_BRAND_SLUG });
      expect(all.at(-1)?.isFallback).toBe(true);
    });
  });

  it("refuses a second fallback", async () => {
    await expect(
      withRollback(async (tx) => {
        await tx.brand.create({
          data: { name: "Otra", key: "otra", slug: "otra", position: 99, isFallback: true },
        });
      }),
    ).rejects.toThrow();
  });

  it("refuses the same name written with another case", async () => {
    await expect(
      withRollback(async (tx) => {
        await tx.brand.create({ data: { name: "X1", key: "x1", slug: "x1", position: 98 } });
        await tx.brand.create({ data: { name: "x1", key: "x1", slug: "x1-b", position: 99 } });
      }),
    ).rejects.toThrow();
  });

  it("creates a new brand active, before the fallback, with a slug", async () => {
    await withRollback(async (tx) => {
      const before = await tx.brand.findMany({ where: { isFallback: false } });
      const brand = await ensureBrand(tx, "  Marca Ñandú Nueva ");
      expect(brand).toMatchObject({
        name: "Marca Ñandú Nueva",
        key: "marca ñandú nueva",
        slug: "marca-nandu-nueva",
        isActive: true,
        isFallback: false,
      });
      const fallback = await tx.brand.findFirstOrThrow({ where: { isFallback: true } });
      expect(brand.position).toBeGreaterThan(Math.max(0, ...before.map((row) => row.position)));
      expect(fallback.position).toBeGreaterThan(brand.position);
    });
  });

  it("reuses the brand typed with another case, keeping the stored spelling", async () => {
    await withRollback(async (tx) => {
      const first = await ensureBrand(tx, "Marca Repetida");
      const again = await ensureBrand(tx, " MARCA repetida ");
      expect(again.id).toBe(first.id);
      expect(again.name).toBe("Marca Repetida");
      expect(await tx.brand.count({ where: { key: "marca repetida" } })).toBe(1);
    });
  });

  it("gives a colliding slug a numeric suffix", async () => {
    await withRollback(async (tx) => {
      const a = await ensureBrand(tx, "Marca-Dos");
      const b = await ensureBrand(tx, "Marca Dos");
      expect([a.slug, b.slug]).toEqual(["marca-dos", "marca-dos-2"]);
    });
  });

  it("resolves a blank name and the fallback's own name to the fallback", async () => {
    await withRollback(async (tx) => {
      const fallback = await tx.brand.findFirstOrThrow({ where: { isFallback: true } });
      expect((await ensureBrand(tx, null)).id).toBe(fallback.id);
      expect((await ensureBrand(tx, "   ")).id).toBe(fallback.id);
      expect((await ensureBrand(tx, "otras MARCAS")).id).toBe(fallback.id);
    });
  });
});
