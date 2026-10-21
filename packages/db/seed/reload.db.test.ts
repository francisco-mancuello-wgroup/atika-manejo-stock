import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient, type Prisma } from "../src/index";
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
});
