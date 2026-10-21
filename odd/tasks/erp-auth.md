# Feature: erp-auth

## Objective

Protect the ERP with a login backed by the existing `users` and `sessions` tables, and seed the owner's account.

## Problem

The ERP is open to anyone who reaches it; it must be locked before going online.

## Scope

- `/login` page (email + password, Spanish copy, B style, wordmark), generic error "Email o contraseña incorrectos".
- Password verification with the existing scrypt helper used by the seed (constant-time compare).
- Sessions: 32-byte random token in an `httpOnly`, `secure` (in production), `sameSite=lax`, `path=/` cookie; only its SHA-256 is stored in `sessions` with `expiresAt` (30 days, sliding refresh optional); logout deletes the row and the cookie.
- `proxy.ts` (Next 16) redirects requests without the session cookie to `/login?next=<path>` (static assets and `/login` excluded); the real check is server-side: `requireSession()` in the ERP layout and at the start of every Server Action; expired/unknown sessions are rejected.
- Logout button in the sidebar footer; show the user's email.
- Seed: admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (upsert by email, hash only). The owner account `fvera@wgroup.com.py` is created by running the seed with those variables set; the password never appears in the repo.
- Basic brute-force protection: per-email + per-IP attempt counter in memory with a short lockout (document limits; acceptable for a single-instance deployment).

## Out of scope

- Password reset, multiple roles, user management UI.

## Constraints

- No auth library. Code in English, UI in Spanish. Builds without `DATABASE_URL`.

## TDD

- Strict, Vitest. Session/token/hash logic and actions tested first; DB tests roll back.

## Tasks

- [ ] T1 — Session core: token, hashing, create/verify/revoke, `requireSession`, tests.
- [ ] T2 — Login page + action + logout, rate limit.
- [ ] T3 — `proxy.ts` + layout guard + guard every Server Action.
- [ ] T4 — Seed admin from env; create the owner account.

## Progress

- 2026-10-21: Document created (user: login for fvera@wgroup.com.py).

## Verification evidence

_None yet._

## Next step

Delegate.
