import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export * from "./generated/prisma/client";

export function createPrismaClient(connectionString: string): PrismaClient {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create the Prisma client");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
