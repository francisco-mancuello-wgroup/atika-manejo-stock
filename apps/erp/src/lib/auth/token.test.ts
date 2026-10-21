import { describe, expect, it } from "vitest";
import {
  generateToken,
  hashToken,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  sessionCookieOptions,
  sessionExpiry,
} from "./token";

describe("session token", () => {
  it("is 32 random bytes encoded as base64url", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(generateToken()).not.toBe(token);
  });

  it("hashes to a stable sha256 hex digest that is not the token", () => {
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  it("expires 30 days after the given instant", () => {
    const now = new Date("2026-10-21T12:00:00.000Z");
    expect(SESSION_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
    expect(sessionExpiry(now).toISOString()).toBe("2026-11-20T12:00:00.000Z");
  });

  it("builds hardened cookie options", () => {
    expect(SESSION_COOKIE).toBe("atika_session");
    const dev = sessionCookieOptions(false);
    expect(dev).toEqual({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
      maxAge: 30 * 24 * 60 * 60,
    });
    expect(sessionCookieOptions(true).secure).toBe(true);
  });
});
