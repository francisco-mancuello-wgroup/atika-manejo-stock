import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export * from "./generated/prisma/client";

export function createPrismaClient(connectionString: string): PrismaClient {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create the Prisma client");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    // Saving a product reprices its whole lot (dozens of rows) inside one transaction; over the
    // remote pooler that passes Prisma's 5 s default and the save is rolled back.
    transactionOptions: { maxWait: 10_000, timeout: 30_000 },
  });
}
