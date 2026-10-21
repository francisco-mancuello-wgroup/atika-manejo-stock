import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient, type Prisma } from "../src/index";
import { type ChoicePlan, NO_LOOKBOOK, productKeys } from "./categories/choices";
import { readPreserved } from "./categories/preserve";
import type { ParsedLot } from "./excel/parse";
import { type ImagePlan, mergeImagePlans } from "./images/seed-images";
import { importLot } from "./reload";

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

const lot: ParsedLot = {
  supplier: "Image test supplier",
  lotName: "Image test lot",
  purchasedAt: "2026-01-15",
  exchangeRate: 7000,
  saleFactor: 2.5,
  vatRate: 0.1,
  costRate: 1,
  totalShippingUsd: 0,
  products: [
    {
      code: null,
      name: "With photos",
      brand: null,
      color: null,
      originalValueUsd: 10,
      variants: [{ size: "M", unitsBought: 1, sold: 0 }],
      sourceRows: [2],
    },
    {
      code: null,
      name: "Without photos",
      brand: null,
      color: null,
      originalValueUsd: 20,
      variants: [{ size: "M", unitsBought: 1, sold: 0 }],
      sourceRows: [3],
    },
  ],
  sales: [],
  warnings: [],
};

const images: ImagePlan = {
  get: (lotName, index) =>
    lotName === lot.lotName && index === 0
      ? [
          { url: "/media/products/test/a.webp", alt: "With photos", position: 0 },
          { url: "/media/products/test/a-2.webp", alt: "With photos", position: 1 },
        ]
      : [],
};

describe.skipIf(!hasDatabase)("importLot images (database)", () => {
  afterAll(async () => {
    await client?.$disconnect();
  });

  it("stores the brand PDF photo as the cover and workbook photos only where there is none", async () => {
    const pdf: ImagePlan = {
      get: (lotName, index) =>
        lotName === lot.lotName && index === 0
          ? [{ url: "/media/products/brand-pdf/test/a.webp", alt: "With photos", position: 0 }]
          : [],
    };
    const workbook: ImagePlan = {
      get: (lotName, index) =>
        lotName !== lot.lotName
          ? []
          : [
              { url: `/media/products/test/wb-${index}.webp`, alt: "workbook", position: 0 },
              { url: `/media/products/test/wb-${index}-2.webp`, alt: "workbook", position: 1 },
            ],
    };
    await withRollback(async (tx) => {
      await importLot(tx, lot, mergeImagePlans(pdf, workbook));
      const products = await tx.product.findMany({
        where: { lot: { name: lot.lotName } },
        orderBy: { createdAt: "asc" },
        include: { images: { orderBy: { position: "asc" } } },
      });
      expect(products[0]?.images.map((i) => [i.position, i.url])).toEqual([
        [0, "/media/products/brand-pdf/test/a.webp"],
      ]);
      expect(products[1]?.images.map((i) => [i.position, i.url])).toEqual([
        [0, "/media/products/test/wb-1.webp"],
        [1, "/media/products/test/wb-1-2.webp"],
      ]);
    });
  });

  it("creates ProductImage rows for products with photos and none for the rest", async () => {
    await withRollback(async (tx) => {
      await importLot(tx, lot, images);
      const products = await tx.product.findMany({
        where: { lot: { name: lot.lotName } },
        orderBy: { createdAt: "asc" },
        include: { images: { orderBy: { position: "asc" } } },
      });
      expect(products.map((p) => p.images.length)).toEqual([2, 0]);
      expect(products[0]?.images.map((i) => [i.position, i.url, i.alt])).toEqual([
        [0, "/media/products/test/a.webp", "With photos"],
        [1, "/media/products/test/a-2.webp", "With photos"],
      ]);
    });
  });

  it("stores the publication state and category chosen for each product", async () => {
    const choices: ChoicePlan = {
      get: (_lotName, index) =>
        index === 0
          ? { isPublished: true, category: "vestidos", lookbook: NO_LOOKBOOK, reason: "test" }
          : { isPublished: false, category: null, lookbook: NO_LOOKBOOK, reason: "test" },
    };
    await withRollback(async (tx) => {
      await importLot(tx, lot, images, choices);
      const products = await tx.product.findMany({
        where: { lot: { name: lot.lotName } },
        orderBy: { id: "asc" },
      });
      expect(products.map((p) => [p.isPublished, p.category])).toEqual([
        [true, "vestidos"],
        [false, null],
      ]);
    });
  });

  it("reads publication and category back by lot, name, code and position before a reload", async () => {
    await withRollback(async (tx) => {
      await importLot(tx, lot, images, {
        get: (_lotName, index) => ({
          isPublished: index === 1,
          category: index === 0 ? "tops" : null,
          lookbook: NO_LOOKBOOK,
          reason: "test",
        }),
      });
      const preserved = await readPreserved(tx);
      const keys = productKeys(lot.lotName, lot.products);
      expect(preserved.get(keys[0] ?? "")).toEqual({
        isPublished: false,
        category: "tops",
        lookbook: NO_LOOKBOOK,
      });
      expect(preserved.get(keys[1] ?? "")).toEqual({
        isPublished: true,
        category: null,
        lookbook: NO_LOOKBOOK,
      });
    });
  });

  it("keeps the lookbook placement and prices with the lot formula", async () => {
    const lookbook = {
      catalog: "sordo" as const,
      catalogOrder: 3,
      catalogSection: "Aros",
      catalogName: "Cubagua",
    };
    await withRollback(async (tx) => {
      await importLot(tx, lot, images, {
        get: (_lotName, index) => ({
          isPublished: true,
          category: null,
          lookbook: index === 0 ? lookbook : NO_LOOKBOOK,
          reason: "test",
        }),
      });
      const [first] = await tx.product.findMany({
        where: { lot: { name: lot.lotName } },
        orderBy: { id: "asc" },
        include: { lot: true },
      });
      expect(first).toMatchObject({
        catalog: "sordo",
        catalogOrder: 3,
        catalogSection: "Aros",
        catalogName: "Cubagua",
      });
      expect(first?.priceGs).toBeGreaterThan(0);
      expect((first?.priceGs ?? 1) % 1000).toBe(0);
      const preserved = await readPreserved(tx);
      expect(preserved.get(productKeys(lot.lotName, lot.products)[0] ?? "")?.lookbook).toEqual(
        lookbook,
      );
    });
  });
});
