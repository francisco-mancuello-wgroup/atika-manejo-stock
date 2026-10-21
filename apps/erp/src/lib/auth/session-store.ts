import type { Prisma } from "@atika/db";
import { generateToken, hashToken, sessionExpiry } from "./token";

type Db = Pick<Prisma.TransactionClient, "session">;

export interface SessionInfo {
  userId: string;
  email: string;
  expiresAt: Date;
}

/** Creates a session row (hash only) and drops the user's already expired ones. */
export async function insertSession(
  db: Db,
  userId: string,
  now: Date,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = sessionExpiry(now);
  await db.session.deleteMany({ where: { userId, expiresAt: { lte: now } } });
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

export async function findSessionByToken(
  db: Db,
  token: string,
  now: Date,
): Promise<SessionInfo | null> {
  const row = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { email: true } } },
  });
  if (!row || row.expiresAt <= now) return null;
  return { userId: row.userId, email: row.user.email, expiresAt: row.expiresAt };
}

export async function deleteSessionByToken(db: Db, token: string): Promise<void> {
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}
