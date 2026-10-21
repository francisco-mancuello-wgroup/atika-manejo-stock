import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "../db";
import {
  deleteSessionByToken,
  findSessionByToken,
  insertSession,
  type SessionInfo,
} from "./session-store";
import { SESSION_COOKIE, sessionCookieOptions } from "./token";

export type { SessionInfo };

export async function createSession(userId: string): Promise<void> {
  const { token } = await insertSession(getDb(), userId, new Date());
  (await cookies()).set(
    SESSION_COOKIE,
    token,
    sessionCookieOptions(process.env.NODE_ENV === "production"),
  );
}

/** The signed-in session, or null for a missing, unknown or expired cookie. */
export async function getSession(): Promise<SessionInfo | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return findSessionByToken(getDb(), token, new Date());
}

/** Call first in every protected layout and Server Action. */
export async function requireSession(): Promise<SessionInfo> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function revokeSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await deleteSessionByToken(getDb(), token);
  store.delete(SESSION_COOKIE);
}
