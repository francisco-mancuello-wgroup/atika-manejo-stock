import { hashPassword, verifyPassword } from "@atika/db/password";
import { afterAll, describe, expect, it } from "vitest";
import { disconnectTestDb, hasDatabase, withRollback } from "../../test/db";
import { hashToken } from "../auth/token";
import { changePassword, createChangePasswordLimiter } from "./change-password";

const CURRENT = "current-password-1";
const NEXT = "brand-new-password-2";
const NOW = new Date("2026-10-21T12:00:00.000Z");

type Tx = Parameters<Parameters<typeof withRollback>[0]>[0];

describe.skipIf(!hasDatabase)("changePassword (database)", () => {
  afterAll(disconnectTestDb);

  async function setup(tx: Tx) {
    const user = await tx.user.create({
      data: {
        email: "change-password-test@example.test",
        passwordHash: await hashPassword(CURRENT),
      },
    });
    const expiresAt = new Date(NOW.getTime() + 86_400_000);
    await tx.session.create({
      data: { tokenHash: hashToken("current"), userId: user.id, expiresAt },
    });
    await tx.session.create({
      data: { tokenHash: hashToken("other"), userId: user.id, expiresAt },
    });
    const stranger = await tx.user.create({
      data: {
        email: "change-password-other@example.test",
        passwordHash: await hashPassword("x".repeat(10)),
      },
    });
    await tx.session.create({
      data: { tokenHash: hashToken("stranger"), userId: stranger.id, expiresAt },
    });
    return { user, ctx: { userId: user.id, currentSessionTokenHash: hashToken("current") } };
  }

  const input = { currentPassword: CURRENT, newPassword: NEXT, confirmPassword: NEXT };
  const deps = () => ({ limiter: createChangePasswordLimiter(), now: () => NOW.getTime() });
  const db = (tx: Tx) => ({ $transaction: <R>(fn: (inner: Tx) => Promise<R>) => fn(tx) });

  it("stores the new hash and drops every other session of the user, keeping the current one", () =>
    withRollback(async (tx) => {
      const { user, ctx } = await setup(tx);
      const result = await changePassword(db(tx), ctx, input, deps());
      expect(result).toEqual({
        status: "success",
        message: "Contraseña actualizada. Cerramos las otras sesiones abiertas.",
      });
      const stored = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(await verifyPassword(NEXT, stored.passwordHash)).toBe(true);
      expect(await verifyPassword(CURRENT, stored.passwordHash)).toBe(false);
      const sessions = await tx.session.findMany({ where: { userId: user.id } });
      expect(sessions.map((s) => s.tokenHash)).toEqual([hashToken("current")]);
      // Other users are untouched.
      expect(await tx.session.count({ where: { tokenHash: hashToken("stranger") } })).toBe(1);
    }));

  it("rejects a wrong current password and changes nothing", () =>
    withRollback(async (tx) => {
      const { user, ctx } = await setup(tx);
      const result = await changePassword(
        db(tx),
        ctx,
        { ...input, currentPassword: "nope" },
        deps(),
      );
      expect(result).toMatchObject({
        status: "error",
        fieldErrors: { currentPassword: "La contraseña actual no es correcta." },
      });
      const stored = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(await verifyPassword(CURRENT, stored.passwordHash)).toBe(true);
      expect(await tx.session.count({ where: { userId: user.id } })).toBe(2);
    }));

  it("limits wrong current passwords per user after 5 failures, even with the right one", () =>
    withRollback(async (tx) => {
      const { ctx } = await setup(tx);
      const shared = deps();
      for (let i = 0; i < 5; i++) {
        const wrong = await changePassword(
          db(tx),
          ctx,
          { ...input, currentPassword: "nope" },
          shared,
        );
        expect(wrong.status).toBe("error");
        expect("fieldErrors" in wrong && wrong.fieldErrors?.currentPassword).toBe(
          "La contraseña actual no es correcta.",
        );
      }
      expect(await changePassword(db(tx), ctx, input, shared)).toEqual({
        status: "error",
        message: "Demasiados intentos. Probá de nuevo en unos minutos.",
      });
    }));
});
