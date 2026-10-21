import "server-only";
import { createPrismaClient, type PrismaClient } from "@atika/db";

const globalForDb = globalThis as typeof globalThis & { atikaPrisma?: PrismaClient };

/**
 * Lazy singleton: nothing connects at import time, so `next build` works without DATABASE_URL.
 * Cached on globalThis so dev hot reloads do not open a new pool each time.
 */
export function getDb(): PrismaClient {
  if (!globalForDb.atikaPrisma) {
    globalForDb.atikaPrisma = createPrismaClient(process.env.DATABASE_URL ?? "");
  }
  return globalForDb.atikaPrisma;
}
