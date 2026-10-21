import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Empty until Neon is provisioned; generate and migrate diff work without a connection.
    url: process.env.DATABASE_URL ?? "",
  },
});
