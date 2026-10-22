import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient, type Prisma } from "../../src/index";
import {
  BANK_MEDIA_URL_PREFIX,
  type BankLogoEntry,
  isUploadedLogoUrl,
  logoUrlFor,
  parseBankManifest,
  planBankLogoFiles,
  upsertBanks,
} from "./seed-banks";

const entry = (over: Partial<BankLogoEntry> = {}): BankLogoEntry => {
  const slug = over.slug ?? "itau";
  return {
    name: "Itaú",
    slug,
    file: `${slug}.webp`,
    sourceUrl: "https://www.itau.com.py/logo.svg",
    fetchedAt: "2026-10-22",
    ...over,
  };
};

describe("isUploadedLogoUrl", () => {
  it("recognizes logos uploaded from the ERP to local disk or Vercel Blob", () => {
    expect(isUploadedLogoUrl("/media/banks/uploads/abc/own.webp")).toBe(true);
    expect(
      isUploadedLogoUrl("https://x1y2.public.blob.vercel-storage.com/banks/uploads/abc/own.webp"),
    ).toBe(true);
  });

  it("does not treat seed logos, other blob folders or missing logos as uploads", () => {
    expect(isUploadedLogoUrl("/media/banks/seed/itau.webp")).toBe(false);
    expect(
      isUploadedLogoUrl("https://x1y2.public.blob.vercel-storage.com/products/uploads/a/b.webp"),
    ).toBe(false);
    expect(isUploadedLogoUrl(null)).toBe(false);
  });
});

describe("parseBankManifest", () => {
  it("reads valid entries, with and without a logo file", () => {
    const parsed = parseBankManifest(
      JSON.stringify([entry(), entry({ name: "FIC", slug: "fic", file: null })]),
    );
    expect(parsed.map((e) => [e.slug, e.file])).toEqual([
      ["itau", "itau.webp"],
      ["fic", null],
    ]);
  });

  it("rejects malformed JSON and entries without a name or slug", () => {
    expect(() => parseBankManifest("nope")).toThrow();
    expect(() => parseBankManifest(JSON.stringify({}))).toThrow();
    expect(() => parseBankManifest(JSON.stringify([{ slug: "x", file: null }]))).toThrow(/name/);
  });

  it("rejects a file name that escapes the logos folder", () => {
    expect(() => parseBankManifest(JSON.stringify([entry({ file: "../x.webp" })]))).toThrow(/file/);
  });

  it("rejects duplicated slugs", () => {
    expect(() => parseBankManifest(JSON.stringify([entry(), entry({ name: "Other" })]))).toThrow(
      /duplicate/i,
    );
  });
});

describe("logoUrlFor / planBankLogoFiles", () => {
  it("builds the seed URL from the slug, null without a file", () => {
    expect(logoUrlFor(entry())).toBe(`${BANK_MEDIA_URL_PREFIX}/itau.webp`);
    expect(BANK_MEDIA_URL_PREFIX).toBe("/media/banks/seed");
    expect(logoUrlFor(entry({ file: null }))).toBeNull();
  });

  it("plans one copy per entry that has a file", () => {
    const files = planBankLogoFiles("/logos", [entry(), entry({ slug: "fic", file: null })]);
    expect(files).toEqual([{ from: "/logos/itau.webp", to: "itau.webp" }]);
  });
});

const hasDatabase = Boolean(process.env.DATABASE_URL);
const client = hasDatabase ? createPrismaClient(process.env.DATABASE_URL ?? "") : undefined;

class Rollback extends Error {}

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

describe.skipIf(!hasDatabase)("upsertBanks", () => {
  afterAll(async () => {
    await client?.$disconnect();
  });

  it("creates missing banks with the seed logo url", async () => {
    await withRollback(async (tx) => {
      const result = await upsertBanks(tx, [entry({ name: "Zz Seed Bank", slug: "zz-seed" })]);
      const row = await tx.bank.findUniqueOrThrow({ where: { name: "Zz Seed Bank" } });
      expect(row.logoUrl).toBe("/media/banks/seed/zz-seed.webp");
      expect(result).toEqual({ created: 1, updated: 0, unchanged: 0, keptUpload: 0 });
    });
  });

  it("matches an existing bank case-insensitively and keeps its stored name", async () => {
    await withRollback(async (tx) => {
      await tx.bank.create({ data: { name: "zz seed bank", logoUrl: null } });
      const result = await upsertBanks(tx, [entry({ name: "ZZ SEED BANK", slug: "zz-seed" })]);
      const rows = await tx.bank.findMany({
        where: { name: { equals: "zz seed bank", mode: "insensitive" } },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.name).toBe("zz seed bank");
      expect(rows[0]?.logoUrl).toBe("/media/banks/seed/zz-seed.webp");
      expect(result.updated).toBe(1);
    });
  });

  it("never replaces a logo the owner uploaded", async () => {
    await withRollback(async (tx) => {
      const uploaded = "/media/banks/uploads/abc/own.webp";
      await tx.bank.create({ data: { name: "Zz Seed Bank", logoUrl: uploaded } });
      const result = await upsertBanks(tx, [entry({ name: "Zz Seed Bank", slug: "zz-seed" })]);
      const row = await tx.bank.findUniqueOrThrow({ where: { name: "Zz Seed Bank" } });
      expect(row.logoUrl).toBe(uploaded);
      expect(result.keptUpload).toBe(1);
    });
  });

  it("is idempotent and does not wipe a logo when the entry has no file", async () => {
    await withRollback(async (tx) => {
      const first = [entry({ name: "Zz Seed Bank", slug: "zz-seed" })];
      await upsertBanks(tx, first);
      const again = await upsertBanks(tx, first);
      expect(again).toEqual({ created: 0, updated: 0, unchanged: 1, keptUpload: 0 });
      await upsertBanks(tx, [entry({ name: "Zz Seed Bank", slug: "zz-seed", file: null })]);
      const row = await tx.bank.findUniqueOrThrow({ where: { name: "Zz Seed Bank" } });
      expect(row.logoUrl).toBe("/media/banks/seed/zz-seed.webp");
    });
  });
});
