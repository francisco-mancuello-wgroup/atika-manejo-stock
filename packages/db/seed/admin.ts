import type { Prisma } from "../src/index";
import { hashPassword } from "../src/password";

// Owner decision (2026-10-21): 8 is the minimum; longer passphrases are still recommended.
export const MIN_ADMIN_PASSWORD_LENGTH = 8;

/**
 * Creates the owner account, or rotates its password when the email already exists. Only the
 * scrypt hash is stored; the email is trimmed and lowercased to match the ERP login lookup.
 */
export async function upsertAdmin(
  db: Pick<Prisma.TransactionClient, "user">,
  rawEmail: string,
  password: string,
): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  if (!email) throw new Error("ADMIN_EMAIL is required");
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD must have at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`);
  }
  const passwordHash = await hashPassword(password);
  await db.user.upsert({
    where: { email },
    create: { email, passwordHash },
    update: { passwordHash },
  });
}
