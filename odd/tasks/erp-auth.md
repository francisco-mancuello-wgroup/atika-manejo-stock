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

- [x] T1 — Session core: token, hashing, create/verify/revoke, `requireSession`, tests. Commit `873e1ef`.
- [x] T2 — Login page + action + logout, rate limit. Commit `30d1a42`.
- [x] T3 — `proxy.ts` + layout guard + guard every Server Action. Commit `a20bffe`.
- [x] T4 — Seed admin from env (owner account creation is a manual step with the owner's password). Commit `2c0816c`.

## Decisions

- scrypt helper moved to `@atika/db/password` (`packages/db/src/password.ts`, tests kept) so the seed and the ERP share one implementation and hash format.
- Pages moved into the `(erp)` route group; its layout calls `requireSession()` and renders the sidebar with the account email. The root layout only holds `html`/`body`, so `/login` has no chrome.
- Guards: `requireSession()` is the first statement of every exported action in `(erp)/**/actions.ts`; `app/actions-guard.test.ts` globs all `actions.ts` modules and asserts each export redirects to `/login` without a cookie and never touches the DB. Only `app/login/actions.ts` (login, logout) is public.
- `proxy.ts` is optimistic only (cookie present); the matcher excludes `_next/static`, `_next/image`, `/media`, favicon and icons, and `isPublicPath` also allows `/login`.
- Rate limit: in memory (single instance), sliding 15-minute window, 5 failures per lowercase email and 20 per IP; limited attempts are refused before any password work (even with the right password); a successful login clears the email counter; stale keys are swept past 10,000 entries. Limits reset on restart. IP comes from the first `x-forwarded-for` hop, then `x-real-ip`, else a shared `unknown` bucket (spoofable without a trusted proxy, so the per-email limit is the real guard; it also means an attacker can lock the owner's email out for 15 minutes).
- Timing: an unknown email still verifies against a cached dummy scrypt hash. All credential failures return "Email o contraseña incorrectos."
- `?next=` accepts only same-origin relative paths (rejects `//`, backslashes, control characters, `/login`).
- Sliding session refresh not implemented (optional in scope): sessions last a fixed 30 days; expired rows of a user are purged when that user creates a session.
- Seed: `packages/db/seed/admin.ts` (`upsertAdmin`, min 12-character password, lowercase/trimmed email, updates the hash when the user exists); README documents creation and rotation.
- TDD mode: strict (Vitest). Note: `client-ip` was written together with its test, so it has no separate RED.

## Progress

- 2026-10-21: Document created (user: login for fvera@wgroup.com.py).
- 2026-10-21: T1-T4 implemented and committed. Pending: run the seed with the owner's credentials (parent).

## Verification evidence

RED observed before each implementation:
- T1: `vitest run src/lib/auth` failed with `Failed to resolve import "./token"` (3 files); GREEN 13 tests.
- T2: next-path, rate-limit and login DB tests failed on missing modules; sidebar email test failed; action and form tests failed on missing modules; GREEN 36 auth tests, 201 erp tests.
- T3: with the guards stashed, `actions-guard.test.ts` failed 9 tests (`promise resolved ... instead of rejecting`); proxy test failed on missing module; GREEN 225 erp tests.
- T4: `seed/admin.test.ts` failed with `Cannot find module './admin'`; GREEN 178 db tests.

Final run at repo root:
- `pnpm lint`: pass (1 pre-existing warning).
- `pnpm typecheck`: 6/6 tasks successful.
- `pnpm test`: ui 36, pricing 15, db 178, catalog 175, erp 225 passed.
- `env -u DATABASE_URL pnpm build`: 3/3 successful; routes dynamic, `Proxy (Middleware)` listed.

Runtime checks (dev server :3001 before restart, and `next start` build on :3002):
- `/` without cookie: 307 to `/login?next=%2F`; `/inventario`: 307 to `/login?next=%2Finventario`; `/login`: 200; POST with a `Next-Action` header to `/ventas` without cookie: 307 to `/login?next=%2Fventas`.
- Garbage cookie on `/inventario`: 307 to `/login` (server-side layout rejection).
- Temporary user with a test password and a real session row (created via the shared hash helper and `insertSession`, then deleted with its sessions): `/` with the cookie returned 200 with the email and "Salir" in the page; `/login?next=/ventas` with the cookie redirected to `/ventas`; after deletion the same cookie was rejected (307 to `/login`).
- Note: the long-running dev server on :3001 kept serving the old root layout (sidebar on every page) after the layout move; restart it to see the new structure. The production build on :3002 showed the correct layout.

## Next step

Run `ADMIN_EMAIL=fvera@wgroup.com.py ADMIN_PASSWORD=<owner password> pnpm db:seed`, restart the dev server, and sign in.
