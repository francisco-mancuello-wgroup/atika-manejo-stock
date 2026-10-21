import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "atika_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** 32 random bytes as base64url: the only secret the browser holds. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only this digest is stored; a leaked `sessions` table cannot be replayed as a cookie. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionExpiry(now: Date): Date {
  return new Date(now.getTime() + SESSION_TTL_MS);
}

export function sessionCookieOptions(production: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: production,
    maxAge: SESSION_TTL_MS / 1000,
  };
}
