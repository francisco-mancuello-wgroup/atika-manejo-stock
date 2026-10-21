import { afterAll, describe, expect, it, vi } from "vitest";
import { createPrismaClient, type Prisma } from "../src/index";
import { verifyPassword } from "../src/password";
import { MIN_ADMIN_PASSWORD_LENGTH, upsertAdmin } from "./admin";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const PASSWORD = "test-password-123";

class Rollback extends Error {}
const client = hasDatabase ? createPrismaClient(process.env.DATABASE_URL ?? "") : undefined;

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

describe("upsertAdmin input", () => {
  it("rejects a missing email or a short password before touching the database", async () => {
    const db = {} as never;
    await expect(upsertAdmin(db, "", PASSWORD)).rejects.toThrow(/ADMIN_EMAIL/);
    await expect(upsertAdmin(db, "owner@example.test", "short")).rejects.toThrow(
      new RegExp(String(MIN_ADMIN_PASSWORD_LENGTH)),
    );
  });
});

describe("upsertAdmin password length", () => {
  it("accepts passwords of at least 8 characters and rejects shorter ones", async () => {
    const upsert = vi.fn(async () => ({}));
    const db = { user: { upsert } } as never;
    await expect(upsertAdmin(db, "owner@example.test", "abcd1234")).resolves.toBeUndefined();
    expect(upsert).toHaveBeenCalledTimes(1);
    await expect(upsertAdmin(db, "owner@example.test", "abc1234")).rejects.toThrow(/at least 8/);
  });
});

describe.skipIf(!hasDatabase)("upsertAdmin (database)", () => {
  afterAll(async () => {
    await client?.$disconnect();
  });

  it("creates the owner with a lowercase email and only a scrypt hash", () =>
    withRollback(async (tx) => {
      await upsertAdmin(tx, "  Owner@Example.TEST ", PASSWORD);
      const user = await tx.user.findUnique({ where: { email: "owner@example.test" } });
      expect(user?.passwordHash.startsWith("scrypt$")).toBe(true);
      expect(user?.passwordHash).not.toContain(PASSWORD);
      expect(await verifyPassword(PASSWORD, user?.passwordHash ?? "")).toBe(true);
    }));

  it("rotates the password of an existing user without duplicating it", () =>
    withRollback(async (tx) => {
      await upsertAdmin(tx, "owner@example.test", PASSWORD);
      await upsertAdmin(tx, "OWNER@example.test", "another-password-456");
      const users = await tx.user.findMany({ where: { email: "owner@example.test" } });
      expect(users).toHaveLength(1);
      expect(await verifyPassword("another-password-456", users[0]?.passwordHash ?? "")).toBe(true);
      expect(await verifyPassword(PASSWORD, users[0]?.passwordHash ?? "")).toBe(false);
    }));
});
