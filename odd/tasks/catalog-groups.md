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
- Web stock per size (T4, SUPERSEDED by T13): the old rule was "visible if `isPublished` OR in an active group".
- "Si se activa un grupo pisa todo" (T13, user, 2026-10-22), replaces the T4 visibility rule:
  - While at least one group is active (switch on, inside its window: `activeGroupWhere(now)`), the web shows ONLY products with allocations in active groups, and only their grouped sizes with the group remainder; sizes outside every active group read 0 (sold out per `showSoldOutSizes`). Manual publication (`isPublished`) is ignored.
  - With no active group, the web is exactly the manual publication: `isPublished`, full physical stock.
  - Several active groups: union of their products. A product in an active group with remainder 0 on every size follows `hideOutOfStock` (hidden, or shown sold out). Lists, counts, collections, presentation, lookbook and product detail (not found outside the active groups) share the same mode.

## Scope

- DB: `PublicationGroup` (name, isActive, startsAt?, endsAt?, timestamps) and `GroupAllocation` (groupId, variantId, allocated, sold; unique per group+variant). Migration.
- ERP domain (`apps/erp/src/lib/catalog-groups`): stock math, create/edit group, set allocations, bulk add by lote / catálogo / categoría / marca (default quantity per size: all free stock), activate/deactivate with validations.
- Sales: `registerSale` consumes the active group remainder first.
- Public catalog: see Decisions (T13): an active group overrides manual publication; otherwise manual publication.
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
- [x] T5 — ERP UI: Grupos tab (table, switch, editor panel with per-size quantities, vigencia, bulk add, preview) + actions, tests.
- [x] T6 — Seed: Pink event group from evento-pink.xlsx (`pnpm db:group`).
- [x] T7 — Groups table rows clickable as a whole (stretched link like /inventario; switch stays clickable). User request.
- [x] T8 — Estado column removed (redundant with the switch); a note next to the switch only when it is on but out of window ("Programado · desde <fecha>" / "Vencido"). User request.
- [x] T9 — Group editor on its own page (`/catalogo-web/grupos/nuevo`, `/catalogo-web/grupos/[id]`) instead of the side panel; Grupos tab is table only. User request ("no me gusta el sidebar").
- [x] T10 — Fix: Asignado input rendered next to Libre (inline input ignored ml-auto); now block + ml-auto under its header. Found by parent screenshot of the Pink group.
- [x] T11 — Group editor redesign (Pencil board G, option A + modal C): breadcrumb, header with status pill and switch, KPI strip, toolbar (search, chips, "Asignar todo el libre", "Agregar prendas"), quantity matrix with dirty tracking and sticky save bar, side cards (datos, cómo se cuenta, zona de riesgo), add-products modal with candidate checklist and proposals ("Todo el libre", "1 por talle", "0"). User request.
- [x] T12 — Agregar prendas modal starts with nothing selected (preselecting everything made deselecting tedious); "Seleccionar las N" selects all. User request.
- [x] T13 — "Si se activa un grupo pisa todo": public catalog switches to groups mode while any group is active (only grouped products and sizes, `isPublished` ignored) and back to manual publication otherwise; ERP Prendas tab shows a notice with the active group names and a link to Grupos. User decision.

## Acceptance criteria

- Activating a group makes the web show only its products with exactly the assigned units per size; deactivating the last active group returns the web to the manual publication and the free inventory goes back up by the unsold remainder.
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
- 2026-10-22: T5 done (commits fbdd9f9 queries/actions, 4a2ee36 UI). Grupos tab at `/catalogo-web?tab=grupos[&grupo=<id|nuevo>]` (selection in the URL like bank promos). Origin/rule is not tracked (no schema change): the table shows the product count. Added `removeProductFromGroup` and a `productIds` filter to `addProductsToGroup` in the domain; a date-only "Hasta" covers the whole day (`endOfDayInput`). Prendas tab gets a "Grupo: <name>" badge (`getCatalogProducts` now takes optional `db`/`now`). New actions live in `catalogo-web/actions.ts` (guard test covers them). Preview line is computed live from the typed quantities.
- 2026-10-22: T6 done (commit 87a245f). `packages/db/seed/group.ts`: env `GROUP_NAME`/`GROUP_FILE`/`GROUP_LOT`/`GROUP_STARTS_AT`/`GROUP_ENDS_AT`; INVENTARIO parsed by header labels until TOTALES; lot inferred from the sheet title; group upserted by name (inactive on create, switch kept); allocation = max(sold, min(stock actual, variant.stock)); `variant.stock` never written; one transaction; unmatched rows listed, not fatal. Documented in `seed/README.md`.
- 2026-10-22: T9 done. `GroupPage` (`components/group-page.tsx`: back link "← Grupos", PageHeader, `GroupEditor`) served by two force-dynamic routes; `[id]` validates the UUID and `notFound()`s. `GroupEditor` lost the panel header/close link (`closeHref` is now `backHref`, used after delete) and owns `GroupEditorActions`; `GroupsView` takes only `setActive`. `workspace.ts`: `parseCatalogTab`, `legacyGroupRedirect` (old `?tab=grupos&grupo=` links redirect), `GROUPS_LIST_HREF`, `NEW_GROUP_HREF`, `groupHref`. Create redirects to `/catalogo-web/grupos/<id>`; group actions also revalidate the group page. Sidebar already highlights by path prefix; no change.
- 2026-10-22: T11 done (commits 3c7070c domain/query, a358c64 page/matrix/bar/cards, 329ba11 modal). `GroupSize.max` (sold + stock not held by other active groups) and `GroupProduct.imageUrl` in `getGroupDetail`; `getGroupCandidates` (+ `listGroupCandidatesAction`, read only) lists products per lote/catálogo/categoría/marca with free stock per size; `groupFreeStock` is shared with `addProductsToGroup`, which takes a proposal (`all` | `one` | `zero`, `proposedAllocation` in stock.ts; `zero` creates rows at 0). Client drafts live in `GroupWorkspace` (`matrix.ts` pure helpers: `reconcileDraft` keeps unsaved typing when the server sends new data); save sends only changed sizes; `beforeunload` warns while dirty. Old `GroupEditor` removed. Deviations: no "Ver en la web" button (the ERP has no public catalog URL setting); the select of the modal shows names only (no counts); `/grupos/nuevo` renders only the DATOS card.
- 2026-10-22: T13 done (commits see evidence). Catalog: `web-stock.ts` has `WebMode` (`webModeFor(activeCount)`), `webStock(variant, mode)`, `webVisibilityWhere(mode, now)`; `queries.ts` runs one `publicationGroup.count` per query call (`CatalogDb` now includes `publicationGroup`) and picks the where-clause and stock mode; `hasActiveGroupStock` removed. Mode is derived per call (`getCollectionPresentation` counts twice, fine). ERP: `getActiveGroupNames` + notice (`role=status`) in `CatalogoWebView`; switches unchanged. Catalog DB tests wrap `withRollback` in `isolated`, which switches off every existing group inside the transaction (local DB has "Evento Pink" active).

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
- T5 RED: `pnpm exec vitest run src/lib/catalog-groups` (apps/erp) -> 4 failed (removeProductFromGroup, productIds) + `format` suite unresolved; `src/lib/queries/catalog.db.test.ts` -> 1 failed (no groupName); `src/app/actions-guard.test.ts` -> 1 failed (group actions missing); `src/components/groups-view.test.tsx` -> suite unresolved, `catalogo-web-view.test.tsx` -> 2 failed (tabs, badge).
- T5 GREEN: same commands pass (catalog-groups 4 files / 53 tests; queries 22; groups-view 15).
- Final (T5): `pnpm --filter @atika/erp test` 93 files / 668 passed; `pnpm --filter @atika/catalog test` 32 files / 258 passed; `pnpm typecheck` 6/6 ok; `pnpm lint` ok (2 known warnings); `pnpm --filter @atika/erp build` ok.
- T6 RED: `pnpm exec vitest run seed/group` (packages/db) -> 2 suites failed (module `./group` missing).
- T6 GREEN: same command -> 9 passed (7 pure + 2 DB with rollback); `pnpm --filter @atika/db test` 32 files / 217 passed; `pnpm typecheck` 6/6 ok; `pnpm lint` ok (2 known warnings).
- T6 run: `GROUP_NAME=Pink GROUP_FILE=~/Descargas/stock-ropas/evento-pink.xlsx pnpm db:group` -> matched 46, units 56, zero rows 1 (COSTA BLACK XS), unmatched 0; second run identical. Query: group Pink isActive=false, 46 allocations, sum allocated 56.
- T7 RED: `pnpm exec vitest run src/components/groups-view.test.tsx` (apps/erp) -> 1 failed (row not relative/cursor-pointer). GREEN: 16 passed; biome clean; erp tsc ok.
- T8 RED: `pnpm exec vitest run src/components/groups-view.test.tsx` (apps/erp) -> 2 failed (Estado header present, no off-window note). GREEN: 17 passed; biome clean; erp tsc ok.
- T9 RED: `pnpm exec vitest run src/lib/catalog-groups/workspace src/components/groups-view src/components/group-editor src/components/group-page` (apps/erp) -> 4 files / 23 tests failed (new helpers, `group-editor`/`group-page` modules missing, row hrefs).
- T9 GREEN: `pnpm --filter @atika/erp test` -> 95 files / 674 passed; `pnpm typecheck` 6/6 ok; `pnpm lint` ok (2 known warnings); `pnpm --filter @atika/erp build` ok, lists `/catalogo-web/grupos/[id]` and `/catalogo-web/grupos/nuevo`.
- T10 RED: `pnpm exec vitest run src/components/group-editor.test.tsx` (apps/erp) -> 1 failed (input lacks block/ml-auto). GREEN: 12 passed; biome clean; headless Chrome screenshot of /catalogo-web/grupos/<Pink> shows inputs under Asignado.
- T11 RED: `pnpm exec vitest run src/lib/catalog-groups src/lib/queries/catalog-groups` (apps/erp) -> 4 files failed / 9 tests failed (proposedAllocation, dayMonth/windowLabel, proposal modes, `max`, `getGroupCandidates` missing); `matrix.test.ts`, `candidates.test.ts`, `group-workspace.test.tsx`, `group-add-modal.test.tsx` each failed on the missing module first.
- T11 GREEN: same files pass (domain/query 104 tests; matrix 12; candidates 3; workspace + page + modal 42); tsc ok. Screenshots of the Pink group (page, dirty bar, modal, nuevo) at 1440px checked.
- T12 RED: `pnpm exec vitest run src/components/group-add-modal.test.tsx` (apps/erp) -> 3 failed (preselected). GREEN: 9 passed; biome clean; erp tsc ok.
- T13 RED: `pnpm exec vitest run src/lib/web-stock.test.ts src/lib/queries.db.test.ts` (apps/catalog) -> 5 pure tests failed (`webModeFor`/`webVisibilityWhere` missing, new `webStock` signature), 4 DB tests failed (active group still showed published/ungrouped products); `pnpm exec vitest run src/lib/queries/catalog-groups.db.test.ts src/components/catalogo-web-view.test.tsx` (apps/erp) -> 2 failed (`getActiveGroupNames` missing, no notice).
- T13 GREEN: same files pass (catalog 261 tests, erp notice + query 25).
- Final (T13): `pnpm --filter @atika/catalog test` 32 files / 261 passed; `pnpm --filter @atika/erp test` 98 files / 723 passed; `pnpm typecheck` 6/6 ok; `pnpm lint` ok (2 known warnings). Visual: `curl localhost:3000/` returned 200 with 68 "Casa Icona" matches and no "Pink"; no "N piezas" text found to compare.

## Next step

User tries `/catalogo-web?tab=grupos`; merge/push decision (user).
