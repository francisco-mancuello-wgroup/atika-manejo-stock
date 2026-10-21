# Feature: erp-inventory

## Objective

Make the ERP functional on the seeded database: see lots, inventory and sales, edit lot pricing parameters with "Guardar y recalcular", and register sales that decrement stock.

## Problem

The database holds 4 lots, 123 products, 193 variants and 20 sales, but every ERP screen is a placeholder.

## Scope

- ERP data access (Prisma client per app, server-only), pages rendered dynamically so `next build` still works without `DATABASE_URL`.
- Resumen, Compras (lot list + lot detail with model × size grid and parameters panel), Inventario, Ventas (list + register sale).
- Server Actions with Zod validation; prices recomputed with `@atika/pricing`; `revalidatePath` after writes.
- Visual reference: Propuesta B screens in `atika.pen` (B · ERP · Resumen, B · ERP · Lote Casa Icona).

## Out of scope

- Login (`erp-auth` feature) — the ERP runs locally without auth until then.
- Catalog app data (`catalog-web` feature), photos, catalog settings screen.
- Editing products/models (only parameters and sales in this feature).

## Constraints

- UI copy in Spanish; code in English. Guaraníes formatted `₲ 2.518.000`, USD `US$ 123,74` (es-PY).
- Money: Prisma `Decimal` mapped to numbers only at the edge; `priceGs` integer.
- A sale never makes stock negative; sale + stock decrement in one transaction.
- Saving lot parameters recalculates `priceGs` for every product of the lot in one transaction.

## TDD

- Mode: strict (session config). Runner: Vitest. Pure mappers/validators/action logic tested first; DB-backed logic tested against the local `atika-postgres` with an isolated test database or transaction rollback.

## Delivery

- Strategy: stacked-to-main. Branch `feat/erp-inventory`. Forecast ~1.200 authored lines → slices per task group.

## Tasks

- [x] T1 — Data layer: `apps/erp/src/lib/db.ts` (lazy singleton), query modules (lots summary, lot detail, inventory, sales) returning plain view models; formatting helpers (₲ / US$). (commit `c5bed9e`)
- [x] T2 — Resumen: KPIs (units in stock, units sold, investment, stock valued at list price, sales this month) + per-lot table + latest sales. (commit `f950517`)
- [x] T3 — Compras: lot list; lot detail grid (model rows × size columns, stock with sold-out marking, unit cost, price ₲); parameters form → Server Action "Guardar y recalcular". (commit `c6b9d1c`)
- [x] T4 — Inventario: product list with lot filter and text search, stock chips per size. (commit `932b3a8`)
- [x] T5 — Ventas: sales list + "Registrar venta" form (product, size with stock, quantity, date, charged price optional, customer) → Server Action with stock guard. (commit `40fa1ed`)

## Progress

- 2026-10-21: T1–T5 implemented by one writer, one commit per task, tests first (strict TDD, Vitest). Routes: `/`, `/compras`, `/compras/[lotId]`, `/inventario`, `/ventas` (all dynamic, `force-dynamic`). Catálogo web and Parámetros keep the placeholder.
- Decisions: `chargedGs` is read as the price charged per unit (sale total = unit price × quantity); shipping may be 0 but exchange rate and sale factor must be positive; percentages are entered as percent and stored as fractions rounded to 4 decimals; "units sold" = units bought − stock; DB-backed tests build their own fixtures inside a transaction that is always rolled back and skip when `DATABASE_URL` is unset.
- `DATABASE_URL` reaches the ERP in dev through `apps/erp/next.config.ts`, which loads the repository root `.env` with `dotenv` (existing variables win, a missing file is ignored). Vitest loads the same file in `vitest.config.ts`.

- 2026-10-21: Document created. User: "ya quiero algo funcional que pueda ver e interactuar".

## Verification evidence

Strict TDD per task: each test file was run first and failed (RED), then the implementation made it pass (GREEN).
- T1 RED: `vitest run src/lib` -> 3 files failed, `Failed to resolve import "./sizes"` (and `./format`, `./dates`); `view-models.test.ts` added afterwards failed on the missing module. GREEN: 37 tests passed (one test expectation of mine was wrong, fixed in the test).
- T2 RED: `resumen-view.test.tsx` failed on the missing `./resumen-view` import and `page.test.tsx` on missing text. GREEN: 42 tests passed.
- T3 RED: `src/lib/lots` -> 2 files failed (`./recalculate`, `./schema` not found); `src/components` -> 3 files failed (`./compras-view`, `./lot-grid`, `./lot-params-form`). GREEN: 68 tests passed, including DB-backed `recalculateLot` / `saveLotParameters` in a rolled-back transaction.
- T4 RED: `./inventory-filters` and `./inventario-view` not found. GREEN: 79 tests passed (jsdom has no implicit role for `<search>`, the test looks the element up directly).
- T5 RED: `src/lib/sales` and `ventas-view` / `sale-form` -> 4 files failed on missing modules. GREEN: 110 tests passed (a Zod 4 gotcha fixed: refinements still run after a failed regex, so the date check must not throw).

Commands from the repository root:
- `pnpm lint`: `Checked 140 files ... No fixes applied.`
- `pnpm typecheck`: 3 tasks successful.
- `pnpm test`: 6 tasks successful; erp 20 files / 110 tests, db 40, ui 34, pricing 15, catalog 9.
- `env -u DATABASE_URL pnpm build`: 3 tasks successful; `/`, `/compras`, `/compras/[lotId]`, `/inventario`, `/ventas` are dynamic (ƒ). Also built with the root `.env` hidden: compiled, same routes.
- Dev server on port 3001 + `curl`: `/`, `/compras`, `/compras/<Casa Icona lot id>`, `/inventario`, `/inventario?q=milonga`, `/ventas` -> 200 with real data ("Casa Icona", "Milonga", KPI 217 units in stock); `/compras/not-a-uuid` -> 404. Server stopped afterwards.
- Seeded database before and after tests and server: 123 products, 193 variants, 20 sales, 217 units in stock (unchanged).

## Next step

Merge `feat/erp-inventory` to `main`.
