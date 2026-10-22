import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createPrismaClient, type Prisma } from "../../src/index";
import { BANK_APP_MEDIA_DIRS, BANK_LOGOS_DIR } from "./paths";

/** Public URL prefix of the copied logos (the ERP's own uploads live under /media/banks/uploads). */
export const BANK_MEDIA_URL_PREFIX = "/media/banks/seed";
const UPLOADS_PREFIX = "/media/banks/uploads/";
/** Logos the ERP uploaded to Vercel Blob (production) live under `banks/uploads/`. */
const BLOB_UPLOAD = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/banks\/uploads\//i;

/** A logo the owner uploaded from the ERP (local disk or Vercel Blob), which the seed never replaces. */
export function isUploadedLogoUrl(url: string | null): boolean {
  return url !== null && (url.startsWith(UPLOADS_PREFIX) || BLOB_UPLOAD.test(url));
}

export interface BankLogoEntry {
  name: string;
  slug: string;
  /** File name inside data/bank-logos, or null when no usable logo was found. */
  file: string | null;
  sourceUrl: string;
  fetchedAt: string;
}

export interface UpsertResult {
  created: number;
  updated: number;
  unchanged: number;
  keptUpload: number;
}

function text(value: unknown, field: string, index: number): string {
  if (typeof value !== "string" || value.trim() === "")
    throw new Error(`Bank manifest entry ${index}: ${field} is required`);
  return value.trim();
}

/** Validates manifest.json: slugs are unique and files cannot leave the logos folder. */
export function parseBankManifest(raw: string): BankLogoEntry[] {
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("Bank manifest must be an array");
  const slugs = new Set<string>();
  return data.map((item: Record<string, unknown>, index) => {
    const name = text(item.name, "name", index);
    const slug = text(item.slug, "slug", index);
    if (slugs.has(slug)) throw new Error(`Bank manifest: duplicate slug "${slug}"`);
    slugs.add(slug);
    const file = item.file === null ? null : text(item.file, "file", index);
    if (file !== null && !/^[a-z0-9][a-z0-9-]*\.webp$/.test(file))
      throw new Error(`Bank manifest entry ${index}: invalid file "${file}"`);
    return {
      name,
      slug,
      file,
      sourceUrl: typeof item.sourceUrl === "string" ? item.sourceUrl : "",
      fetchedAt: typeof item.fetchedAt === "string" ? item.fetchedAt : "",
    };
  });
}

export async function readBankManifest(dir: string): Promise<BankLogoEntry[] | undefined> {
  try {
    return parseBankManifest(await readFile(join(dir, "manifest.json"), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export function logoUrlFor(entry: BankLogoEntry): string | null {
  return entry.file ? `${BANK_MEDIA_URL_PREFIX}/${entry.file}` : null;
}

/** One copy per entry that has a logo; `to` is relative to each app's media folder. */
export function planBankLogoFiles(
  dir: string,
  entries: readonly BankLogoEntry[],
): { from: string; to: string }[] {
  return entries.flatMap((e) => (e.file ? [{ from: join(dir, e.file), to: e.file }] : []));
}

/**
 * Creates the missing banks and sets the seed logo. Matches by name ignoring case, never deletes,
 * never replaces a logo the owner uploaded and never clears a logo when the entry has none.
 */
export async function upsertBanks(
  tx: Prisma.TransactionClient,
  entries: readonly BankLogoEntry[],
): Promise<UpsertResult> {
  const result: UpsertResult = { created: 0, updated: 0, unchanged: 0, keptUpload: 0 };
  for (const entry of entries) {
    const logoUrl = logoUrlFor(entry);
    const existing = await tx.bank.findFirst({
      where: { name: { equals: entry.name, mode: "insensitive" } },
    });
    if (!existing) {
      await tx.bank.create({ data: { name: entry.name, logoUrl } });
      result.created++;
    } else if (isUploadedLogoUrl(existing.logoUrl)) {
      result.keptUpload++;
    } else if (logoUrl === null || existing.logoUrl === logoUrl) {
      result.unchanged++;
    } else {
      await tx.bank.update({ where: { id: existing.id }, data: { logoUrl } });
      result.updated++;
    }
  }
  return result;
}

async function copyBankLogos(
  targetDirs: readonly string[],
  files: readonly { from: string; to: string }[],
): Promise<void> {
  for (const target of targetDirs) {
    // Only the seed folder is rebuilt; owner uploads live in a sibling folder.
    await rm(target, { recursive: true, force: true });
    await mkdir(target, { recursive: true });
    for (const file of files) await cp(file.from, join(target, file.to));
  }
}

type Client = ReturnType<typeof createPrismaClient>;

/** Seeds the banks from data/bank-logos and copies their logos for the apps to serve. */
export async function seedBanks(prisma: Client): Promise<string> {
  const entries = await readBankManifest(BANK_LOGOS_DIR);
  if (!entries) return "No data/bank-logos/manifest.json: banks are not seeded";
  const result = await prisma.$transaction((tx) => upsertBanks(tx, entries), {
    timeout: 60_000,
    maxWait: 30_000,
  });
  const files = planBankLogoFiles(BANK_LOGOS_DIR, entries);
  await copyBankLogos(BANK_APP_MEDIA_DIRS, files);
  const withoutLogo = entries.filter((e) => !e.file).map((e) => e.name);
  return (
    `Banks: ${result.created} created, ${result.updated} updated, ${result.unchanged} unchanged, ` +
    `${result.keptUpload} keep an uploaded logo; ${files.length} logos copied` +
    (withoutLogo.length ? `; without logo: ${withoutLogo.join(", ")}` : "")
  );
}

async function main(): Promise<void> {
  config({ path: fileURLToPath(new URL("../../../../.env", import.meta.url)), quiet: true });
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const prisma = createPrismaClient(databaseUrl);
  try {
    console.log(await seedBanks(prisma));
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
