# Feature: pink-from-group

## Objective

The home Pink event (banner + "Ver selección Pink", `/catalogos/pink`) is driven by the active publication group instead of the manual `Product.inPink` check, and the web keeps showing every published product.

## Problem / why

After merging Francisco's Pink selection (`inPink` flag, banner, `/catalogos/pink`) with catalog-groups, two "Pink" concepts coexisted: the manual check and the "Evento Pink" group (stock assigned per size). The owner wants one: the group is the event. User decision 2026-10-22 ("continuá tu pedido" on the proposal):
- The web shows all products as usual (manual publication). This reverts catalog-groups T13 ("an active group overrides everything").
- The group is the Pink event: the banner and `/catalogos/pink` show the products of the active group(s), with the group's assigned stock. With no active (in-window) group the banner is not shown and `/catalogos/pink` has nothing to show.
- `inPink` is no longer set by hand: a product is Pink when it is in an active group.

## Scope

- Public catalog visibility back to the catalog-groups T4 rule: visible if `isPublished` OR has remaining stock in an active group; web stock per size = group remainder for grouped variants, free inventory for the rest.
- Pink selection = products with allocations in active groups (union if several). Banner only when there is at least one active group with pieces.
- Remove `inPink`: ERP lookbook form check, ERP schema/save/queries, catalog queries/lookbook, seed (choices/preserve/lookbook), DB column (migration), tests.
- ERP Prendas notice (catalog-groups T13) replaced: when a group is active, say it is shown as the Pink event on the home.

## Constraints

- Never write `variant.stock` from groups.
- UI copy Spanish (voseo); code/comments English.
- Francisco authored the Pink UI: keep his banner design and copy.

## TDD

- Strict (session config), Vitest: `pnpm --filter <pkg> test`; DB tests use `withRollback`. Observe RED before GREEN.

## Tasks

- [x] T1 — Catalog: revert override (OR rule) and derive Pink from active groups (lookbook pinkPages, banner visibility, `/catalogos/pink`), tests.
- [x] T2 — Remove `inPink` (ERP form/schema/save/queries, seed, DB column migration), ERP Prendas notice updated, tests.

## Acceptance criteria

- With "Evento Pink" active: home shows the three catalogs with their published products and the Pink banner; `/catalogos/pink` shows exactly the group's products with their assigned stock.
- With the group off: no banner; catalogs unchanged.
- No `inPink` left in code or schema.
- lint, typecheck, all package tests and both builds pass.

## Delivery

- Strategy: ask-on-risk. Forecast ~350 authored lines. RDD: off (global).

## Progress

- 2026-10-22: Document created (branch feat/pink-from-group from main 4f67c6d).
- 2026-10-22: T1 done. T13 commit reverted (`web-stock.ts`/`queries.ts` back to the T4 OR rule, `isolated` kept in DB tests). Pink = `inGroup` flag on lookbook pieces (some variant has an allocation of an active group), computed in `listLookbook` before the stock rewrite; `pinkPages` filters by it; `hasPinkPieces` drives `CatalogShelf pink`. Pink page keeps page granularity (a look page with one grouped colour shows its other colours too) and sizes outside the group read free stock.
- 2026-10-22: T2 done. `inPink` removed from ERP form/schema/queries, seed and DB. Notice shown only when a group is active ("... sus prendas son la selección Pink de la portada, con el stock asignado." + Ver grupos); no permanent hint (lighter, the Grupos tab already explains).

## Verification evidence

- T1 RED: `pnpm exec vitest run src/lib/lookbook.test.ts src/components/lookbook src/lib/queries.db.test.ts src/lib/web-stock.test.ts` (apps/catalog) -> 3 failed (`inGroup` flag, `CatalogShelf pink={false}` still showed banner; `hasPinkPieces` missing). `hasPinkPieces` tests were added after the code (GREEN only).
- T1 GREEN: `pnpm exec vitest run` (apps/catalog) -> 34 files / 271 passed; tsc ok. Commits 74a4292 (+ test commit for hasPinkPieces).
- T2 RED: `pnpm exec vitest run src/schema.test.ts` (packages/db) -> 1 failed (`inPink` still a Product field); erp notice/lookbook tests updated first.
- T2 GREEN: migration `20261022070000_drop_product_in_pink` applied (`pnpm db:migrate`), client regenerated. Commit 954bbdc.
- Final: `pnpm --filter @atika/db test` 32 files / 218 passed; erp 102 files / 734 passed; catalog 34 files / 271 passed; `pnpm typecheck` 6/6 ok; `pnpm lint` ok (2 known warnings); erp and catalog builds ok.
- Visual (Evento Pink switched on temporarily, then back off): home shows Pink banner + catalogs; `/catalogos/pink` shows Casa Icona, 18 piezas only. With the group off the home has no banner.

## Next step

Parent: review, merge/push decision (user).
