# Feature: change-password

## Objective

Let the signed-in owner change their password from a "Seguridad" section in the ERP.

## Scope

- Sidebar item "Seguridad" (last), page `/seguridad` with one form: "Contraseña actual", "Nueva contraseña", "Repetir nueva contraseña", button "Cambiar contraseña".
- Rules: current password must verify (shared scrypt `@atika/db/password`); new ≥ 8 characters (same minimum as the seed), different from the current one, both new fields equal. Generic error for a wrong current password: "La contraseña actual no es correcta."
- On success: store the new hash, delete every other session of the user (keep the current one), show "Contraseña actualizada. Cerramos las otras sesiones abiertas."
- Rate limit wrong current-password attempts per user with the existing in-memory limiter (5 per 15 min) → "Demasiados intentos. Probá de nuevo en unos minutos."
- Action guarded with `requireSession()`; actions guard test updated.

## Out of scope

- Password reset by email, multiple users management.

## TDD

- Strict, Vitest; DB tests roll back.

## Tasks

- [x] T1 — Change-password logic + schema + tests. Commit 13b4fa6.
- [x] T2 — Page, form, sidebar item. Commit c624c90.

## Progress

- 2026-10-21: Document created.
- 2026-10-21: T1 and T2 implemented. Shared `MIN_PASSWORD_LENGTH` now lives in `@atika/db/password` (seed re-exports it as `MIN_ADMIN_PASSWORD_LENGTH`). The action derives the current session hash from the cookie (`hashToken`). Only wrong current-password attempts count toward the limiter; validation errors do not.

## Verification evidence

- RED T1: `vitest run src/lib/account` failed, `./change-password` could not be resolved (2 files failed, no tests).
- RED T2: sidebar test failed (1 failed, missing "Seguridad"); `change-password-form.test.tsx` failed on the unresolved `./change-password-form` import.
- GREEN: `src/lib/account` 9/9 (incl. DB tests with a temporary user and two sessions, rolled back); components + app 119/119.
- `pnpm lint`: ok (1 pre-existing warning in next-path.ts). `pnpm typecheck`: 6/6 ok. `pnpm test`: erp 362, db 188, catalog 217, ui 36, pricing 27, all passed. `env -u DATABASE_URL pnpm build`: ok.
- Runtime: unauthenticated `GET :3001/seguridad` -> 307 to `/login?next=%2Fseguridad`.

## Next step

Review and merge to main (user decision).
