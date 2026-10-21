import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Stored format: scrypt$N$r$p$saltBase64$hashBase64 (parameters travel with the hash so they can
// be raised later without invalidating existing passwords).
const N = 32_768;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const MAX_MEMORY = 128 * N * R * 2;

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      { N: n, r, p, maxmem: Math.max(MAX_MEMORY, 128 * n * r * 2) },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const hash = await derive(password, salt, N, R, P);
  return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join("$");
}

/** Constant-time check; a malformed stored value is simply "not a match". */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const params = [n, r, p].map(Number);
  if (!params.every((value) => Number.isInteger(value) && value > 0)) return false;
  const [cost, blockSize, parallelization] = params as [number, number, number];

  const expected = Buffer.from(hash, "base64");
  try {
    const actual = await derive(
      password,
      Buffer.from(salt, "base64"),
      cost,
      blockSize,
      parallelization,
    );
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
