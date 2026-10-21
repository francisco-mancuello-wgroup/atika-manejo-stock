import { createPrismaClient, type Prisma, type PrismaClient } from "@atika/db";

class Rollback extends Error {}

export const hasDatabase = Boolean(process.env.DATABASE_URL);

let client: PrismaClient | undefined;

function testDb(): PrismaClient {
  client ??= createPrismaClient(process.env.DATABASE_URL ?? "");
  return client;
}

export async function disconnectTestDb(): Promise<void> {
  await client?.$disconnect();
  client = undefined;
}

/** Runs `fn` in a transaction that is always rolled back, so the seeded database stays intact. */
export async function withRollback<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  let result: T | undefined;
  let completed = false;
  try {
    await testDb().$transaction(async (tx) => {
      result = await fn(tx);
      completed = true;
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
  if (!completed) throw new Error("withRollback callback did not complete");
  return result as T;
}

let counter = 0;

/** Creates a lot with the given products (`variants` are [size, stock]) and returns their ids. */
export async function createProducts(
  tx: Prisma.TransactionClient,
  products: {
    name: string;
    isPublished?: boolean;
    category?: string;
    priceGs?: number;
    color?: string;
    description?: string;
    /** Photo URLs, first one is the cover. */
    photos?: string[];
    variants: [string, number][];
  }[],
  supplierName?: string,
): Promise<string[]> {
  counter += 1;
  const supplier = await tx.supplier.create({
    data: { name: supplierName ?? `Catalog test supplier ${counter}-${Date.now()}` },
  });
  const lot = await tx.lot.create({
    data: {
      supplierId: supplier.id,
      name: `Catalog test lot ${counter}`,
      purchasedAt: new Date("2026-01-15T00:00:00.000Z"),
      exchangeRate: 7000,
      saleFactor: 2.5,
      vatRate: 0.1,
      costRate: 0.5,
      totalShippingUsd: 20,
    },
  });
  const ids: string[] = [];
  for (const [index, product] of products.entries()) {
    const created = await tx.product.create({
      data: {
        lotId: lot.id,
        name: product.name,
        category: product.category ?? null,
        originalValueUsd: 77.77,
        priceGs: product.priceGs ?? 100_000,
        isPublished: product.isPublished ?? true,
        color: product.color ?? null,
        description: product.description ?? null,
        // Explicit, strictly increasing timestamps keep "newest first" deterministic.
        createdAt: new Date(Date.UTC(2030, 0, 1 + index)),
        variants: {
          create: product.variants.map(([size, stock]) => ({ size, unitsBought: stock, stock })),
        },
        images: {
          create: (product.photos ?? []).map((url, position) => ({ url, position })),
        },
      },
    });
    ids.push(created.id);
  }
  return ids;
}
