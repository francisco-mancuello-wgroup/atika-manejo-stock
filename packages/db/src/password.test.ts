import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("stores scrypt$N$r$p$salt$hash and never the plain password", async () => {
    const stored = await hashPassword("correct horse");
    const [scheme, n, r, p, salt, hash] = stored.split("$");
    expect(scheme).toBe("scrypt");
    expect([n, r, p].map(Number).every((value) => Number.isInteger(value) && value > 0)).toBe(true);
    expect(salt).toBeTruthy();
    expect(hash).toBeTruthy();
    expect(stored).not.toContain("correct horse");
  });

  it("verifies the right password and rejects a wrong one", async () => {
    const stored = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", stored)).toBe(true);
    expect(await verifyPassword("battery staple", stored)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("rejects malformed stored values instead of throwing", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "bcrypt$1$2$3$a$b")).toBe(false);
    expect(await verifyPassword("x", "scrypt$a$b$c$d$e")).toBe(false);
  });
});
