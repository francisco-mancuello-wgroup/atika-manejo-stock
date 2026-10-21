# Feature: excel-import

## Objective

Populate the database with the four inventory workbooks so the ERP and catalog start from real data, and keep a repeatable seed.

## Problem

Stock, costs and sales live in `INVENTARIO - CASA ICONA`, `MILONGA`, `ZUNILDA GUTIERREZ` and `ÁTIKA` workbooks with inconsistent conventions (see Data rules). There is no database running yet.

## Scope

- Local Postgres for development: Docker Compose service `atika-postgres` (postgres:18-alpine) on host port 5436, matching the per-project container pattern already used on this machine.
- Prisma driver adapter switched from `@prisma/adapter-neon` to `@prisma/adapter-pg`: works with local Postgres and with Neon connection strings, so there is one code path.
- Apply migration `20261021000000_init`.
- Excel parser (pure, tested) → normalized lots/products/variants/sales.
- Seed script: suppliers, lots with pricing params, products with `priceGs` computed by `@atika/pricing`, variants (`unitsBought`, `stock`), sales, default `CatalogSettings`, admin user (scrypt) from env.
- Idempotent: re-running the seed resets and reloads imported data.

## Out of scope

- Production database (Neon) provisioning — needs user approval.
- Product photos.
- Committing workbook data to git: the seed reads the workbooks from `ATIKA_EXCEL_DIR` (outside the repo).

## Data rules (from 2026-10-21 analysis and user decisions)

- Every struck-through row/size or "retiro"/"VENTAS" note is a **sale** (user: "todo es venta"). Stock = units bought − units sold.
- Price formula from `@atika/pricing`, factor **2,5** for every lot (Milonga/Zunilda used ×3, Átika ×2 — replaced). Workbook prices are not imported.
- Exchange rate is per lot (workbooks mix 7009 / 7400 / 7140): take each lot's own value.
- Shipping: Casa Icona US$ 2.265,12; Milonga ₲ 9.000.000; Zunilda ₲ 5.150.000 (convert to USD with the lot's rate); Átika none.
- Casa Icona rows with qty > 1 store the TOTAL cost in "costo unitario": divide by qty.
- Cost rate: 1.0 unless a workbook states a cost percentage.
- Known quirks to report, not guess: Casa Icona G43 references row 49; Zunilda "JARDÍN MAXI" red font; Átika manual prices.

## Constraints

- Code/docs in English; UI-facing seed values (catalog settings text) in Spanish.
- Secrets only in `.env` (gitignored); `.env.example` committed.
- Never touch the other projects' containers.

## TDD

- Mode: strict (session config). Runner: Vitest. Parser/normalizer tested with in-memory fixtures before implementation.

## Delivery

- Strategy: stacked-to-main. Branch `feat/excel-import`. Forecast ~500 authored lines → two slices (infra+adapter, parser+seed).

## Tasks

- [x] T1 — Local DB: `docker-compose.yml`, `.env.example`, adapter-pg in `@atika/db`, `db:migrate` applies init migration. Commit `f815f69`.
- [x] T2 — Parser (TDD): read workbooks (sizes, qty, original value, strikethrough → sales, per-lot params), normalize with data rules. Commit `e567ed0`.
- [x] T3 — Seed: load normalized data with Prisma in a transaction, compute prices with `@atika/pricing`, admin user + catalog settings; `pnpm db:seed`. Commit `16c05de`.
  - Accept: seed runs twice without duplicates (verified); totals reported below. Units bought match the analysis (237); units sold are 20 vs ≈18 (see open questions).

## Progress

- 2026-10-21: Document created.
- 2026-10-21: T1–T3 implemented and committed on `feat/excel-import` (TDD: strict, Vitest). Docs commit follows.
- Decisions: single root `.env` (loaded by `prisma.config.ts` and the seed); `tsx` runs the seed (`pnpm db:seed`); `esbuild` added to pnpm `allowBuilds`; parser finds columns by header label, not position (see `packages/db/seed/README.md`).

## Verification evidence

TDD RED/GREEN:
- T1 RED: after removing `@prisma/adapter-neon`, `pnpm test` in `@atika/db` failed to load `src/index.ts` (import of the removed adapter); GREEN after switching to `@prisma/adapter-pg` (7 tests passed, including a new local-connection-string test).
- T2 RED: `parse.test.ts` failed with "Failed to resolve import ./parse" (module absent, 0 tests run); GREEN after implementation (36 tests passed in `@atika/db`).
- T3 RED: `password.test.ts` failed with no tests run (module `./password` absent); GREEN after implementation (4 password tests).

Commands (repo root):
- `pnpm install`: ok (lockfile updated).
- `pnpm lint`: Checked 87 files, no fixes applied.
- `pnpm typecheck`: 6 of 6 tasks successful.
- `pnpm test`: 6 of 6 tasks successful (db 40 tests, pricing 15, ui 34, catalog 9, erp 14).
- `env -u DATABASE_URL pnpm build`: 3 of 3 tasks successful (apps build without a database).
- `pnpm db:migrate`: `20261021000000_init` applied on `atika-postgres`; later runs report "No pending migrations to apply".
- `pnpm db:seed` run twice: identical output; SQL counts after the second run: suppliers 4, lots 4, products 123, variants 193, sales 20, users 1, catalog_settings 1; sum units bought 237, stock 217, units sold 20.

Totals per lot (unit counts only; costs and investment are business data and are printed by `pnpm db:seed`, not stored in the repo):

| Lot               | Products | Bought | Sold | In stock |
| ----------------- | -------- | ------ | ---- | -------- |
| Casa Icona        | 18       | 57     | 1    | 56       |
| Milonga           | 60       | 99     | 13   | 86       |
| Zunilda Gutierrez | 17       | 51     | 3    | 48       |
| Átika             | 28       | 30     | 3    | 27       |
| Total             | 123      | 237    | 20   | 217      |

Cost totals match the workbooks' own totals for Milonga, Zunilda and Átika. Casa Icona's workbook total double counts rows with qty > 1 (its "COSTO TOTAL" multiplies the already-total "unit cost" by qty); the seed uses the corrected per-unit cost.

## Data quirks and how they were handled

- Casa Icona: "COSTO UNITARIO" holds the total for qty > 1; divided by qty. Unit cost is a constant 55 % of "VALOR ORIGINAL" in every row, so the lot gets `costRate` 0.55 and `originalValueUsd` is the workbook value (same price as a cost-rate-1 import using the unit cost).
- Casa Icona G43 references row 49 (`=F49*E49`): result equals the row's own cost; no effect.
- Zunilda "JARDÍN MAXI" (red font, no colour): imported as normal stock with colour null, no sale.
- Átika: manual prices and mixed formulas (factor 2, 1.1 or none) ignored; every price is recomputed (factor 2,5, IVA 10 %).
- Átika exchange rate: 7400 for 27 units, 7140 for the three struck rows (all sold); lot uses 7400 (most common), the 7140 rows are warned about.
- Átika: five rows have no name; named "Sin nombre (<brand>)". Brand "Casa Icona"/"Zunilda Gutierrez"/"Sordo" rows are products of their own brand inside the Átika lot.
- Milonga: size columns `XS/S` and `M/L` kept as their own variants (only PALC04 and two more rows use them); descriptions contain a trailing letter ("Cardigan A"), whitespace collapsed to "Cardigan A".
- Milonga: two rows (ATLC02, ATLC06) have a sale only in the note ("1 (S) - 23/06/2026"), no strikethrough; counted as sales. Struck cell plus matching note are counted once.
- Zunilda: sales note lists two XS sales on one struck cell with qty 2; one sale per dated entry.
- Lot purchase date: not in the workbooks; uses the workbook creation date (Casa Icona and Milonga 2025-10-06, Zunilda 2024-08-22, Átika 2025-10-22). All sales carry their own date.
- Shipping per unit is prorated over units bought, so Zunilda's workbook value of 14,50 per unit differs slightly from the computed 14,41 (₲ 5.150.000 / 7009 / 51).

## Open questions

1. Sales: the seed finds 20 units sold (Casa 1, Milonga 13, Zunilda 3, Átika 3) against ≈18 in the analysis. Which two should not count? (Candidates: the two Milonga note-only sales, or Átika rows 11–12 branded Casa Icona.)
2. Casa Icona cost rate 0.55 inferred from the data (no workbook states it): keep, or import with cost rate 1 and the unit cost as original value?
3. Milonga combined sizes `XS/S` and `M/L`: keep as is, or map to a single size?
4. Átika rows at 7140: keep in the 7400 lot, or split into a second lot?
5. Lot purchase dates: confirm real dates (workbook creation dates are a placeholder).
6. Unnamed Átika products and the trailing letter in Milonga names: provide names or meaning.
7. Admin email is `admin@atika.local` (placeholder) and the WhatsApp number is a placeholder.

## Next step

Merge to `main`.
