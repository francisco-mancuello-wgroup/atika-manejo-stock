import { hashPassword, verifyPassword } from "@atika/db/password";
import { afterAll, describe, expect, it, vi } from "vitest";
import { disconnectTestDb, hasDatabase, withRollback } from "../../test/db";
import { authenticate, createLoginLimiters } from "./login";

const PASSWORD = "test-password-123";
const NOW = 1_000_000;

describe.skipIf(!hasDatabase)("authenticate (database)", () => {
  afterAll(disconnectTestDb);

  async function setup(tx: Parameters<Parameters<typeof withRollback>[0]>[0]) {
    const user = await tx.user.create({
      data: { email: "login-test@example.test", passwordHash: await hashPassword(PASSWORD) },
    });
    return user;
  }

  it("accepts the right password, ignoring email case and spaces", () =>
    withRollback(async (tx) => {
      const user = await setup(tx);
      const result = await authenticate(
        tx,
        { email: "  Login-Test@Example.TEST ", password: PASSWORD },
        "1.1.1.1",
        { limiters: createLoginLimiters(), now: () => NOW },
      );
      expect(result).toEqual({ status: "ok", userId: user.id });
    }));

  it("answers the same for a wrong password and an unknown email", () =>
    withRollback(async (tx) => {
      await setup(tx);
      const deps = { limiters: createLoginLimiters(), now: () => NOW };
      const wrong = await authenticate(
        tx,
        { email: "login-test@example.test", password: "nope" },
        "1.1.1.1",
        deps,
      );
      const unknown = await authenticate(
        tx,
        { email: "ghost@example.test", password: PASSWORD },
        "1.1.1.1",
        deps,
      );
      expect(wrong).toEqual({ status: "invalid" });
      expect(unknown).toEqual(wrong);
    }));

  it("still runs a password verification when the user does not exist", () =>
    withRollback(async (tx) => {
      const verify = vi.fn(verifyPassword);
      await authenticate(tx, { email: "ghost@example.test", password: "x" }, "1.1.1.1", {
        limiters: createLoginLimiters(),
        now: () => NOW,
        verify,
      });
      expect(verify).toHaveBeenCalledTimes(1);
    }));

  it("limits an email after 5 failures, even with the right password", () =>
    withRollback(async (tx) => {
      await setup(tx);
      const deps = { limiters: createLoginLimiters(), now: () => NOW };
      const bad = { email: "login-test@example.test", password: "nope" };
      for (let i = 0; i < 5; i++) {
        expect((await authenticate(tx, bad, "1.1.1.1", deps)).status).toBe("invalid");
      }
      const right = { email: "login-test@example.test", password: PASSWORD };
      expect(await authenticate(tx, right, "2.2.2.2", deps)).toEqual({ status: "limited" });
    }));

  it("clears the email counter after a successful login", () =>
    withRollback(async (tx) => {
      await setup(tx);
      const deps = { limiters: createLoginLimiters(), now: () => NOW };
      const email = "login-test@example.test";
      for (let i = 0; i < 4; i++)
        await authenticate(tx, { email, password: "no" }, "1.1.1.1", deps);
      expect((await authenticate(tx, { email, password: PASSWORD }, "1.1.1.1", deps)).status).toBe(
        "ok",
      );
      for (let i = 0; i < 4; i++)
        await authenticate(tx, { email, password: "no" }, "1.1.1.1", deps);
      expect((await authenticate(tx, { email, password: PASSWORD }, "1.1.1.1", deps)).status).toBe(
        "ok",
      );
    }));
});

describe("authenticate (limits without a database)", () => {
  const db = { user: { findUnique: async () => null } } as never;

  it("limits an IP after 20 failures across different emails, until the window passes", async () => {
    let now = NOW;
    const deps = {
      limiters: createLoginLimiters(),
      now: () => now,
      verify: async () => false,
    };
    for (let i = 0; i < 20; i++) {
      const result = await authenticate(
        db,
        { email: `u${i}@x.test`, password: "p" },
        "9.9.9.9",
        deps,
      );
      expect(result.status).toBe("invalid");
    }
    expect(await authenticate(db, { email: "new@x.test", password: "p" }, "9.9.9.9", deps)).toEqual(
      {
        status: "limited",
      },
    );
    expect(
      (await authenticate(db, { email: "new@x.test", password: "p" }, "8.8.8.8", deps)).status,
    ).toBe("invalid");
    now += 15 * 60_000 + 1;
    expect(
      (await authenticate(db, { email: "new@x.test", password: "p" }, "9.9.9.9", deps)).status,
    ).toBe("invalid");
  });

  it("treats empty or oversized input as an invalid login", async () => {
    const deps = { limiters: createLoginLimiters(), now: () => NOW, verify: async () => false };
    expect((await authenticate(db, { email: "", password: "" }, "1.1.1.1", deps)).status).toBe(
      "invalid",
    );
    expect(
      (await authenticate(db, { email: "a@b.c", password: "x".repeat(5000) }, "1.1.1.1", deps))
        .status,
    ).toBe("invalid");
  });
});
