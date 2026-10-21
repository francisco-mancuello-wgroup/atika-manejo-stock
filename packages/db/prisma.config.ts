import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// The single `.env` lives at the repository root so the seed, Prisma CLI and apps share it.
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Empty when no database is configured; generate and migrate diff work without a connection.
    url: process.env.DATABASE_URL ?? "",
  },
});
