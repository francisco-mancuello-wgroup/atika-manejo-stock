import "server-only";
import type { Prisma } from "@atika/db";
import { hashPassword, verifyPassword } from "@atika/db/password";
import { z } from "zod";
import { type AttemptLimiter, createAttemptLimiter } from "./rate-limit";

export const MAX_EMAIL_FAILURES = 5;
export const MAX_IP_FAILURES = 20;
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

export interface LoginLimiters {
  email: AttemptLimiter;
  ip: AttemptLimiter;
}

export function createLoginLimiters(): LoginLimiters {
  return {
    email: createAttemptLimiter({ max: MAX_EMAIL_FAILURES, windowMs: ATTEMPT_WINDOW_MS }),
    ip: createAttemptLimiter({ max: MAX_IP_FAILURES, windowMs: ATTEMPT_WINDOW_MS }),
  };
}

const globalForLimiters = globalThis as typeof globalThis & { atikaLoginLimiters?: LoginLimiters };

/** Process-wide limiters, kept on globalThis so dev hot reloads do not reset them. */
export function sharedLoginLimiters(): LoginLimiters {
  globalForLimiters.atikaLoginLimiters ??= createLoginLimiters();
  return globalForLimiters.atikaLoginLimiters;
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1).max(254),
  password: z.string().min(1).max(1024),
});

export type AuthResult =
  | { status: "ok"; userId: string }
  | { status: "invalid" }
  | { status: "limited" };

interface AuthDeps {
  limiters?: LoginLimiters;
  now?: () => number;
  verify?: (password: string, stored: string) => Promise<boolean>;
}

let dummyHash: Promise<string> | undefined;

/** Hash verified when the user does not exist, so both paths cost the same scrypt run. */
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword("atika-dummy-password");
  return dummyHash;
}

/**
 * Checks credentials. Every failure looks the same to the caller (no user enumeration); only
 * the rate limit answers differently, and it is checked before any password work.
 */
export async function authenticate(
  db: Pick<Prisma.TransactionClient, "user">,
  input: { email: string; password: string },
  ip: string,
  deps: AuthDeps = {},
): Promise<AuthResult> {
  const limiters = deps.limiters ?? sharedLoginLimiters();
  const now = (deps.now ?? Date.now)();
  const verify = deps.verify ?? verifyPassword;

  const parsed = loginSchema.safeParse(input);
  const emailKey = parsed.success ? parsed.data.email : input.email.trim().toLowerCase();
  const limited = limiters.ip.isLimited(ip, now) || limiters.email.isLimited(emailKey, now);
  if (limited) return { status: "limited" };

  const fail = (): AuthResult => {
    limiters.ip.recordFailure(ip, now);
    if (emailKey) limiters.email.recordFailure(emailKey, now);
    return { status: "invalid" };
  };
  if (!parsed.success) return fail();

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const matches = await verify(parsed.data.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !matches) return fail();

  limiters.email.reset(emailKey);
  return { status: "ok", userId: user.id };
}
