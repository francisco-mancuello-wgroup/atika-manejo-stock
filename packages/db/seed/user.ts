import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createPrismaClient } from "../src/index";
import { upsertAdmin } from "./admin";

const USAGE = "Usage: USER_EMAIL=<email> USER_PASSWORD=<password> pnpm db:user";

/** Reads the account to create or update; the password never comes from a file in the repo. */
export function readUserInput(env: Record<string, string | undefined>): {
  email: string;
  password: string;
} {
  const email = env.USER_EMAIL?.trim();
  const password = env.USER_PASSWORD;
  if (!email) throw new Error(`USER_EMAIL is required. ${USAGE}`);
  if (!password) throw new Error(`USER_PASSWORD is required. ${USAGE}`);
  return { email, password };
}

/** Creates an ERP user, or rotates its password, without reloading any workbook data. */
async function main(): Promise<void> {
  config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });
  const { email, password } = readUserInput(process.env);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const prisma = createPrismaClient(databaseUrl);
  try {
    await upsertAdmin(prisma, email, password);
    console.log(`ERP user ready: ${email.toLowerCase()}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
