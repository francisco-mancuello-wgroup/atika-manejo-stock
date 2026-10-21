import { afterAll, describe, expect, it } from "vitest";
import { disconnectTestDb, hasDatabase, withRollback } from "../../test/db";
import { deleteSessionByToken, findSessionByToken, insertSession } from "./session-store";
import { hashToken } from "./token";

const NOW = new Date("2026-10-21T12:00:00.000Z");

describe.skipIf(!hasDatabase)("session store (database)", () => {
  afterAll(disconnectTestDb);

  it("stores only the token hash and finds the session with the user email", () =>
    withRollback(async (tx) => {
      const user = await tx.user.create({
        data: { email: "session-test@example.test", passwordHash: "x" },
      });
      const { token, expiresAt } = await insertSession(tx, user.id, NOW);

      const rows = await tx.session.findMany({ where: { userId: user.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.tokenHash).toBe(hashToken(token));
      expect(rows[0]?.tokenHash).not.toBe(token);
      expect(rows[0]?.expiresAt).toEqual(expiresAt);

      expect(await findSessionByToken(tx, token, NOW)).toEqual({
        userId: user.id,
        email: "session-test@example.test",
        expiresAt,
      });
    }));

  it("rejects unknown tokens and expired sessions", () =>
    withRollback(async (tx) => {
      const user = await tx.user.create({
        data: { email: "session-expired@example.test", passwordHash: "x" },
      });
      const { token, expiresAt } = await insertSession(tx, user.id, NOW);
      expect(await findSessionByToken(tx, "nope", NOW)).toBeNull();
      expect(await findSessionByToken(tx, token, expiresAt)).toBeNull();
      expect(await findSessionByToken(tx, token, new Date(expiresAt.getTime() + 1))).toBeNull();
    }));

  it("deletes the session and purges the user's expired rows on create", () =>
    withRollback(async (tx) => {
      const user = await tx.user.create({
        data: { email: "session-revoke@example.test", passwordHash: "x" },
      });
      const old = await insertSession(tx, user.id, new Date("2026-01-01T00:00:00.000Z"));
      const fresh = await insertSession(tx, user.id, NOW);
      expect(await tx.session.count({ where: { tokenHash: hashToken(old.token) } })).toBe(0);

      await deleteSessionByToken(tx, fresh.token);
      expect(await findSessionByToken(tx, fresh.token, NOW)).toBeNull();
      await deleteSessionByToken(tx, fresh.token);
    }));
});
