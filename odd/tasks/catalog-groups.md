# Feature: catalog-groups

## Objective

Publication groups on /catalogo-web (Pencil board "F · Catálogo web · Grupos · Opciones", option A): a group publishes a set of products on the web and assigns a per-size quantity of inventory stock to the web ("virtual stock"). Deactivating a group returns its unsold assigned stock to the inventory.

## Problem / why

Today the owner publishes products one by one (`Product.isPublished`, bulk switch, publish all) and the web shows the whole physical stock. The owner wants to activate sets of products at once and decide how many units of each size the web can sell, raising the quantity when needed, without touching the store stock by hand.

## Decisions (user, 2026-10-22)

- Option A: "Grupos" tab with a groups table (name, rule, prendas/stock, vigencia, estado, switch) and an editor side panel.
- Each group assigns stock per product size (variant). The assigned quantity is linked to the web.
- Sales have NO origin field. Rule adopted: while a variant is in an active group, every registered sale of that variant consumes the group's remaining assigned stock first (counter `sold` on the allocation, updated in the same transaction as the sale). Once the group remainder is 0, sales consume free inventory.
- Virtual stock is derived, never moved: `variant.stock` stays the physical total.
  - group remaining = max(0, allocated − sold), capped by physical stock.
  - free inventory = stock − remaining of active groups.
  - Deactivating a group stops counting its remainder (it returns to inventory with no writes to `stock`).
- Assigned quantity can be raised up to free inventory + its current remainder; it can't go below what was already sold.
- A variant can be in only one active group at a time (activation is refused otherwise).
- Web stock per size (T4): a size with an active allocation shows its remainder; any other size shows its free inventory (stock minus active remainders, i.e. all its stock) only if the product is `isPublished`, otherwise 0. A product is visible if published, or if some size keeps remainder > 0 in an active group (even with `hideOutOfStock` off); `hideOutOfStock` and the size filter are judged on web stock.

## Scope

- DB: `PublicationGroup` (name, isActive, startsAt?, endsAt?, timestamps) and `GroupAllocation` (groupId, variantId, allocated, sold; unique per group+variant). Migration.
- ERP domain (`apps/erp/src/lib/catalog-groups`): stock math, create/edit group, set allocations, bulk add by lote / catálogo / categoría / marca (default quantity per size: all free stock), activate/deactivate with validations.
- Sales: `registerSale` consumes the active group remainder first.
- Public catalog: a product is visible if `isPublished` OR it has remaining stock in an active, in-window group. Size stock shown on the web = group remainder for grouped variants, free inventory for the rest of published products.
- ERP UI: "Grupos" tab in /catalogo-web (table + editor panel with per-size quantities, vigencia, preview); free vs assigned shown where stock is shown in /catalogo-web.

## Out of scope

- Automatic rules that keep re-evaluating membership (bulk add is a one-off snapshot).
- Sale origin / channel.
- Orders or stock reservations from the web cart (still WhatsApp).

## Constraints

- Never write `variant.stock` from groups.
- UI copy Spanish (voseo); code/comments English.
- Server actions: `requireSession()` + `getDb()`, return `FormState`, revalidate affected paths.

## TDD

- Strict (session config), Vitest: `pnpm --filter <pkg> test` / `pnpm exec vitest run <paths>` inside the package. DB tests use `withRollback`. Observe RED before GREEN.

## Tasks

- [x] T1 — DB: `PublicationGroup` + `GroupAllocation` models, migration, schema test.
- [x] T2 — ERP domain: stock math + group save/allocations/bulk add/activate-deactivate with validations, tests.
- [x] T3 — Sales consume the active group remainder first (`registerSale`), tests.
- [x] T4 — Public catalog: visibility and size stock from groups, tests.
- [ ] T5 — ERP UI: Grupos tab (table, switch, editor panel with per-size quantities, vigencia, bulk add, preview) + actions, tests.

## Acceptance criteria

- Activating a group makes its products visible on the web with exactly the assigned units per size; deactivating hides them (unless manually published) and the free inventory goes back up by the unsold remainder.
- Registering a sale of a grouped variant lowers the web quantity; selling everything leaves the size sold out on the web.
- Raising the assignment shows more units on the web, never more than free inventory allows.
- `variant.stock` is only changed by sales and the product form.
- lint, typecheck and all package tests pass.

## Delivery

- Strategy: ask-on-risk. Forecast ~1200 authored lines (over the ~400 budget). RDD: off (global).

## Progress

- 2026-10-22: Document created (branch feat/catalog-groups).
- 2026-10-22: T1 done (commit 4e970bb). `GroupAllocation.variantId` is Restrict (like `Sale`): a variant in a group can't be deleted and silently drop its sold history; deleting a group cascades to its allocations.
- 2026-10-22: T2 done (commit 9a8b9bc). `apps/erp/src/lib/catalog-groups/`: `stock.ts` (pure math, `activeGroupWhere`), `schema.ts`, `groups.ts` (create/update, `setGroupAllocations`, `addProductsToGroup`, activate/deactivate/delete). "Active" for stock math = switch on and `now` inside the window (ends inclusive); the one-active-group-per-variant check uses the switch only (stricter, so overlapping future windows can't collide). The "up to free stock" limit is enforced while the group is switched on and re-checked at activation.
- 2026-10-22: T3 done (commit d4b8a24). `registerSale` uses its `now` (registration instant, not the date-only `soldAt`) to decide whether the group is active; consumed = min(quantity, remainder computed with the stock before the sale).
- 2026-10-22: T4 done (commit f773273). Pure math in `apps/catalog/src/lib/web-stock.ts` (small duplicate of the ERP remainder math, no shared package: apps can't import each other and it is a few lines). The DB `where` only narrows (published OR some active allocation, physical stock > 0); remainder > 0 and web-stock filters apply in memory in `withWebStock`. `countProductsByCategory` now counts in memory over the same rows as `listProducts` so counts and lists agree.

## Verification evidence

- T1 RED: `pnpm --filter @atika/db test` -> 2 failed (`PublicationGroup` / `GroupAllocation` missing from ModelName and scalar fields).
- T1 GREEN: migration `20261022050000_publication_groups` applied to local DB (`pnpm db:migrate`), client regenerated; `pnpm --filter @atika/db test` -> 208 passed.
- T2 RED: `pnpm exec vitest run src/lib/catalog-groups` (apps/erp) -> 3 files failed (modules `./stock`, `./schema`, `./groups` unresolved).
- T2 GREEN: same command -> 3 files / 43 tests passed; erp tsc ok.
- T3 RED: `pnpm exec vitest run src/lib/sales/register.test.ts` -> 3 failed (group `sold` not incremented), 17 passed.
- T3 GREEN: `pnpm exec vitest run src/lib/sales` -> 34 passed.
- Final (T1-T3): `pnpm --filter @atika/db test` 208 passed; `pnpm --filter @atika/erp test` 89 files / 624 passed; `pnpm typecheck` 6/6 ok; `pnpm lint` ok (2 known warnings).
- T4 RED: `pnpm exec vitest run src/lib/web-stock.test.ts` (apps/catalog) -> suite failed (module `./web-stock` missing); `pnpm exec vitest run src/lib/queries.db.test.ts` -> 4 failed, 27 passed (groups not read).
- T4 GREEN: `pnpm --filter @atika/catalog test` -> 32 files / 258 passed; `pnpm typecheck` 6/6 ok; `pnpm lint` ok (2 known warnings).

## Next step

T5.
