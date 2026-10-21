import "server-only";
import type { Prisma } from "@atika/db";
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from "@atika/db/password";
import { z } from "zod";
import { type AttemptLimiter, createAttemptLimiter } from "../auth/rate-limit";

export const MAX_PASSWORD_FAILURES = 5;
export const PASSWORD_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

export function createChangePasswordLimiter(): AttemptLimiter {
  return createAttemptLimiter({
    max: MAX_PASSWORD_FAILURES,
    windowMs: PASSWORD_ATTEMPT_WINDOW_MS,
  });
}

const globalForLimiter = globalThis as typeof globalThis & {
  atikaChangePasswordLimiter?: AttemptLimiter;
};

/** Process-wide limiter (per user id), kept on globalThis so dev hot reloads do not reset it. */
export function sharedChangePasswordLimiter(): AttemptLimiter {
  globalForLimiter.atikaChangePasswordLimiter ??= createChangePasswordLimiter();
  return globalForLimiter.atikaChangePasswordLimiter;
}

const MAX_LENGTH = 1024;

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresá tu contraseña actual.").max(MAX_LENGTH),
    newPassword: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      )
      .max(MAX_LENGTH, "La nueva contraseña es demasiado larga."),
    confirmPassword: z.string().max(MAX_LENGTH),
  })
  .superRefine((value, context) => {
    if (value.confirmPassword !== value.newPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Las contraseñas nuevas no coinciden.",
      });
    }
    if (value.newPassword === value.currentPassword) {
      context.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "La nueva contraseña tiene que ser distinta de la actual.",
      });
    }
  });

export type ChangePasswordResult =
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

interface Deps {
  limiter?: AttemptLimiter;
  now?: () => number;
  verify?: (password: string, stored: string) => Promise<boolean>;
}

/**
 * Changes the signed-in user's password. The new hash and the revocation of every other session
 * happen in one transaction. Passwords are never returned or logged; only wrong current-password
 * attempts count against the per-user rate limit.
 */
export async function changePassword(
  db: { $transaction: <R>(fn: (tx: Prisma.TransactionClient) => Promise<R>) => Promise<R> },
  session: { userId: string; currentSessionTokenHash: string },
  input: { currentPassword: string; newPassword: string; confirmPassword: string },
  deps: Deps = {},
): Promise<ChangePasswordResult> {
  const limiter = deps.limiter ?? sharedChangePasswordLimiter();
  const now = (deps.now ?? Date.now)();
  const verify = deps.verify ?? verifyPassword;

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      if (field && !(field in fieldErrors)) fieldErrors[field] = issue.message;
    }
    return { status: "error", message: "Revisá los campos marcados.", fieldErrors };
  }

  if (limiter.isLimited(session.userId, now)) {
    return { status: "error", message: "Demasiados intentos. Probá de nuevo en unos minutos." };
  }

  const { currentPassword, newPassword } = parsed.data;
  const newHash = await hashPassword(newPassword);

  return db.$transaction(async (tx): Promise<ChangePasswordResult> => {
    const user = await tx.user.findUnique({ where: { id: session.userId } });
    if (!user || !(await verify(currentPassword, user.passwordHash))) {
      limiter.recordFailure(session.userId, now);
      return {
        status: "error",
        message: "Revisá los campos marcados.",
        fieldErrors: { currentPassword: "La contraseña actual no es correcta." },
      };
    }
    await tx.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
    await tx.session.deleteMany({
      where: { userId: user.id, tokenHash: { not: session.currentSessionTokenHash } },
    });
    limiter.reset(session.userId);
    return {
      status: "success",
      message: "Contraseña actualizada. Cerramos las otras sesiones abiertas.",
    };
  });
}
