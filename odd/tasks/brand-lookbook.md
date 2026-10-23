# Feature: brand-lookbook

## Objective

The public lookbook is organised by brand automatically (one "catalog" per brand), and the ERP lets the owner turn each brand on or off for the web, order the brands and give each one a cover.

## Problem / why

User request 2026-10-23: "el lookbook son las marcas, ¿es posible quitar y dejar por marcas el catálogo? y también la opción de activar/desactivar por marcas". Today the lookbook shows three hand-assigned catalogs (`Product.catalog` enum casa_icona | milonga | sordo + `catalogOrder` page). Local DB (2026-10-23): 8 brands; 47 products with a brand are in no lookbook (all 24 Zunilda Gutierrez, My Beachy Side, Sandro, Baobab, Jacquemus, part of Milonga/Sordo/Casa Icona); a product created in the ERP never reaches the lookbook unless its catalog is set by hand.

User decision 2026-10-23 ("adelante") on this design:
1. Lookbook built automatically by `Product.brand`: each active brand is one catalog with its published (or active-group) products.
2. ERP "Marcas": per brand an Activa/Inactiva switch (inactive brand disappears from the whole web: lookbook, Ver todo, product page, search, Pink), display order on the home, optional cover (default: first photo of the brand; Casa Icona, Milonga, Sordo keep their current covers).
3. Keep existing page order: pieces with `catalogOrder` keep their PDF page and shared-page sets; pieces without a page follow, newest first.
4. Products without brand go to "Otras marcas", which can also be turned on/off.

## Scope

- Data: `Brand` (name unique case-insensitive, slug unique, isActive default true, position, coverUrl nullable), filled by the migration from the distinct `Product.brand` values plus the "Otras marcas" fallback; new brands typed in a product are created on save. `Product.brand` stays a string matched to `Brand.name`. `Product.catalog` stays in the DB (not dropped, no data loss) but no longer decides the lookbook.
- Catalog app: lookbook / home / `/catalogos/[slug]` by brand slug (old slugs casa-icona, milonga, sordo keep working); Pink-only sections by brand; inactive brands excluded from every public query.
- ERP: "Marcas" page (list with product counts, switch, reorder, cover upload/remove through the existing storage selection: MEDIA_DIR > Blob > dev public); lookbook form drops the "Catálogo" field (keeps Página and Sección); nav entry.

## Constraints

- UI copy Spanish (voseo), code/comments English.
- Migrations additive only.
- No change to pricing, stock or group logic beyond excluding inactive brands.

## TDD

- Strict (session config), Vitest; DB tests with `withRollback` on the local Docker DB (`localhost:5436`). Observe RED before GREEN.

## Tasks

- [x] T1 — Data: `Brand` model + migration (backfill from products + "Otras marcas"), brand ensured on product save, tests.
- [x] T2 — Catalog: lookbook and Pink-only sections by brand, ordering rule, covers, old slugs, inactive brands hidden everywhere, tests.
- [x] T3 — ERP: "Marcas" page (switch, order, cover), nav, lookbook form without "Catálogo", tests.
- [x] T4 — ERP cleanup (user 2026-10-23, "adelante"): remove the per-product "Lookbook" button/modal (Página, Sección, Nombre en el lookbook) and its action; page order inside a brand stays automatic (stored `catalogOrder` first, the rest newest first); replace the Prendas "Filtro por lookbook" (old `Product.catalog`) with a "Filtro por marca" over every brand; group-candidate filter by catalog → by brand too.

## Progress / evidence

- Branch `feat/brand-lookbook` from main c4d71e4.
- T1 done. RED: `brands.test.ts` failed (module missing), `save.test.ts` 2 brand tests failed, `reload.db.test.ts` brand test failed; GREEN: `@atika/db` 39 files / 271 tests, `save.test.ts` 19/19. Migration `20261023210000_brands` (table + partial unique index for the single fallback + backfill) applied locally; `prisma migrate diff` shows no drift.
  - Decisions: `Brand.key` = lower(trim(name)) is the identity; `Product.brand` stays text and is saved with the brand's stored spelling ("milonga" -> "Milonga"); `ensureBrand` (`@atika/db/brands`) creates new brands before the fallback; seed reload also registers brands; reserved slugs (`todos`, `pink`) get `-marca`; the seed's `clearImported` does not touch brands, so activation survives a re-seed.
- T1 commit 40ca204; T2 commit 44c77b0.
- T2 done. RED: `lookbook.test.ts` 7 failing (order, brandCover), `queries.db.test.ts` 18 failing (listLookbook shape/brand); GREEN: catalog 42 files / 350 tests. Rules: lookbook = active brands in `position` order with >= 1 page; pieces with `catalogOrder` first (page = brand + old catalog + number, so numbers of different old catalogs never merge), then the rest newest first; cover = `Brand.coverUrl` > static cover (casa-icona/milonga/sordo/otras-marcas) > first photo of first page; `/catalogos/<brand slug>` (old slugs equal the backfilled brand slugs, no redirect needed); one brand condition (`brandGateOf`) inside `visibleWhere` and the lookbook read, so lists, counts, product page, orders, collections and Pink all follow it. `listPinkOnly`/`pinkOnlySection`/`OTHER_BRANDS` removed: every piece now belongs to a brand lookbook, so Pink is the pink pages of each brand.
- T3 done. RED: cover-storage/save.db/brands-view tests (modules missing), actions-guard (marcas module), lookbook schema/save/view tests, product-form brand suggestions; GREEN: db 271, catalog 350, erp 895 (actions-guard 41/41, pedidos added to its list), ui 48, typecheck 6/6, lint 2 known warnings, migrate status up to date. ERP: tab "Marcas" (`/catalogo-web?tab=marcas`) with switch, up/down, cover upload/remove (MEDIA_DIR > Blob > dev public, `/media/brands/uploads/<brandId>/<file>.webp`), bumps the catalog version; lookbook form lost "Catálogo" (kept Página, Sección, Nombre: the latter feeds labels and sales search); product form suggests registered brands (datalist).
- T4 done (commit 838d142). RED: filters/catalog.db/catalog-groups.db/groups.db/group-add-modal/filter.db tests failing (11 + new module missing); GREEN: erp 127 files / 907 tests, catalog 350, typecheck 6/6, lint 2 known warnings. Removed `lookbook-form.tsx`, `saveLookbookAction`, `saveProductLookbook`, `parseLookbook`/`lookbookSchema` and their tests. Prendas filter: `?marca=<slug>`, one link per brand in `position` order with counts + "Todas"; fallback "Otras marcas" takes no/unregistered brand; unknown slug and old `?catalogo=` are ignored. Group bulk add: "Catálogo" criterion removed, "Marca" lists registered brands (slug value, Otras marcas last), filter resolved by `brandProductWhere` (`apps/erp/src/lib/brands/filter.ts`). Bug caught by test: brand OR was overridden by the text-search OR, now combined with AND.

## Next step

User review; on the VPS run `prisma migrate deploy` (migration `20261023210000_brands`) before deploying the apps; restart both apps after `prisma generate`.
