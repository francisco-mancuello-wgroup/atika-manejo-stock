# Feature: erp-loading-skeletons

## Objective

Every ERP screen shows a skeleton while its server data loads, instead of a frozen page with no feedback.

## Problem / why

The ERP routes are dynamic Server Components that query the database. No route has a `loading.tsx`, so navigating between screens keeps the previous page on screen (or a blank area) until the new one finishes rendering. User request 2026-10-22: add skeleton loading to the ERP only (the public catalog is out of scope).

## Scope

- A shared `Skeleton` primitive (pulse block) in `packages/ui`, exported from `@atika/ui`.
- ERP skeleton compositions that mirror the real layouts: list/table screens, detail screens, form screens, dashboard.
- `loading.tsx` files under `apps/erp/src/app/(erp)/` so the sidebar and currency toggle stay visible and only the content area shows the skeleton.
- Out of scope: the catalog app, the login page, client-side pending states inside forms.

## Constraints

- Read the bundled Next.js docs (`apps/erp/node_modules/next/dist/docs/`) for `loading.tsx` / Suspense before writing (see `apps/erp/AGENTS.md`).
- Respect `prefers-reduced-motion` (no pulse animation).
- Accessible: the loading region is announced (`aria-busy` / `role="status"` with a visually hidden label).
- UI copy Spanish (voseo); code and comments English. Tailwind theme tokens from `@atika/ui`.

## Tasks

- [x] T1 — `Skeleton` primitive in `packages/ui` with a test, exported from the package index.
- [x] T2 — ERP skeleton compositions (table, detail, form, dashboard) with tests.
- [x] T3 — `loading.tsx` for every ERP route segment, each using the composition that matches its page.

## Acceptance criteria

- Navigating to any ERP screen shows a skeleton in the content area, with the sidebar still visible.
- With reduced motion the skeleton does not animate.
- lint, typecheck, `@atika/ui` and `@atika/erp` tests, and the ERP build pass.

## Progress

- T1 done: commit 99d6805 `feat(ui): add Skeleton primitive` (author fvera).
- T2 done: commit 9090944 `feat(erp): add loading skeleton compositions` (author fvera).
