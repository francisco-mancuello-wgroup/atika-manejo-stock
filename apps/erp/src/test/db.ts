import { createPrismaClient, type Prisma, type PrismaClient } from "@atika/db";

class Rollback extends Error {}

export const hasDatabase = Boolean(process.env.DATABASE_URL);

let client: PrismaClient | undefined;

export function testDb(): PrismaClient {
  client ??= createPrismaClient(process.env.DATABASE_URL ?? "");
  return client;
}

export async function disconnectTestDb(): Promise<void> {
  await client?.$disconnect();
  client = undefined;
}

/**
 * Runs `fn` inside a transaction that is always rolled back, so DB-backed tests never leave
 * data behind (the seeded database stays untouched).
 */
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

/** A `$transaction` facade that reuses an already open (rolled back) transaction. */
export function dbOver(tx: Prisma.TransactionClient) {
  return { $transaction: <R>(fn: (inner: Prisma.TransactionClient) => Promise<R>) => fn(tx) };
}

/**
 * Like `dbOver`, but each `$transaction` runs inside a savepoint that is rolled back when the
 * callback throws, so all-or-nothing flows can be tested inside the rolled back outer transaction.
 */
export function dbOverSavepoint(tx: Prisma.TransactionClient) {
  let depth = 0;
  return {
    $transaction: async <R>(fn: (inner: Prisma.TransactionClient) => Promise<R>): Promise<R> => {
      const name = `test_sp_${++depth}`;
      await tx.$executeRawUnsafe(`SAVEPOINT ${name}`);
      try {
        const result = await fn(tx);
        await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${name}`);
        return result;
      } catch (error) {
        await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${name}`);
        throw error;
      }
    },
  };
}

let counter = 0;

/** Creates a supplier, lot, products and variants with deterministic, known numbers. */
export async function createFixtureLot(
  tx: Prisma.TransactionClient,
  products: {
    name: string;
    originalValueUsd: number;
    priceGs?: number;
    variants: [string, number, number][];
  }[],
) {
  counter += 1;
  const supplier = await tx.supplier.create({
    data: { name: `Test supplier ${counter}-${Date.now()}` },
  });
  const lot = await tx.lot.create({
    data: {
      supplierId: supplier.id,
      name: `Test lot ${counter}`,
      purchasedAt: new Date("2026-01-15T00:00:00.000Z"),
      exchangeRate: 7000,
      saleFactor: 2.5,
      vatRate: 0.1,
      costRate: 0.5,
      totalShippingUsd: 20,
    },
  });
  const created = [];
  for (const product of products) {
    created.push(
      await tx.product.create({
        data: {
          lotId: lot.id,
          name: product.name,
          originalValueUsd: product.originalValueUsd,
          priceGs: product.priceGs ?? 1000,
          variants: {
            create: product.variants.map(([size, unitsBought, stock]) => ({
              size,
              unitsBought,
              stock,
            })),
          },
        },
        include: { variants: true },
      }),
    );
  }
  return { lot, products: created };
}
