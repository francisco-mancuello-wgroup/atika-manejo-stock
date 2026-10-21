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

- [ ] T1 — Change-password logic + schema + tests.
- [ ] T2 — Page, form, sidebar item.

## Progress

- 2026-10-21: Document created.

## Verification evidence

_None yet._

## Next step

Delegate.
