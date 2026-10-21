import { describe, expect, it, vi } from "vitest";
import { changePassword, createChangePasswordLimiter } from "./change-password";

const ctx = { userId: "u1", currentSessionTokenHash: "hash" };
const valid = {
  currentPassword: "old-password",
  newPassword: "new-password",
  confirmPassword: "new-password",
};

function setup(matches = true) {
  const tx = {
    user: {
      findUnique: vi.fn(async () => ({ id: "u1", passwordHash: "stored" })),
      update: vi.fn(async () => ({})),
    },
    session: { deleteMany: vi.fn(async () => ({ count: 1 })) },
  };
  const db = { $transaction: <R>(fn: (t: typeof tx) => Promise<R>) => fn(tx) };
  const verify = vi.fn(async () => matches);
  return {
    tx,
    db: db as never,
    deps: { limiter: createChangePasswordLimiter(), now: () => 1, verify },
  };
}

describe("changePassword validation", () => {
  it("requires both new passwords to match", async () => {
    const { db, deps, tx } = setup();
    const result = await changePassword(
      db,
      ctx,
      { ...valid, confirmPassword: "other-password" },
      deps,
    );
    expect(result).toMatchObject({
      status: "error",
      fieldErrors: { confirmPassword: "Las contraseñas nuevas no coinciden." },
    });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("requires at least 8 characters", async () => {
    const { db, deps } = setup();
    const result = await changePassword(
      db,
      ctx,
      { ...valid, newPassword: "short7!", confirmPassword: "short7!" },
      deps,
    );
    expect(result).toMatchObject({
      fieldErrors: { newPassword: "La nueva contraseña debe tener al menos 8 caracteres." },
    });
  });

  it("requires a password different from the current one", async () => {
    const { db, deps } = setup();
    const result = await changePassword(
      db,
      ctx,
      {
        currentPassword: "same-password",
        newPassword: "same-password",
        confirmPassword: "same-password",
      },
      deps,
    );
    expect(result).toMatchObject({
      fieldErrors: { newPassword: "La nueva contraseña tiene que ser distinta de la actual." },
    });
  });

  it("does not count validation errors against the limiter nor verify the password", async () => {
    const { db, deps } = setup();
    for (let i = 0; i < 6; i++) {
      await changePassword(db, ctx, { ...valid, confirmPassword: "x" }, deps);
    }
    expect(deps.verify).not.toHaveBeenCalled();
    expect((await changePassword(db, ctx, valid, deps)).status).toBe("success");
  });

  it("never echoes passwords back", async () => {
    const { db, deps } = setup(false);
    const result = await changePassword(db, ctx, valid, deps);
    expect(JSON.stringify(result)).not.toContain("old-password");
    expect(JSON.stringify(result)).not.toContain("new-password");
  });
});

describe("changePassword session handling", () => {
  it("deletes the sessions of the user except the current one", async () => {
    const { db, deps, tx } = setup();
    await changePassword(db, ctx, valid, deps);
    expect(tx.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", tokenHash: { not: "hash" } },
    });
  });
});
