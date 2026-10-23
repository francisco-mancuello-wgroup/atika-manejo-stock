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
- [ ] T2 — Catalog: lookbook and Pink-only sections by brand, ordering rule, covers, old slugs, inactive brands hidden everywhere, tests.
- [ ] T3 — ERP: "Marcas" page (switch, order, cover), nav, lookbook form without "Catálogo", tests.

## Progress / evidence

- Branch `feat/brand-lookbook` from main c4d71e4.
- T1 done. RED: `brands.test.ts` failed (module missing), `save.test.ts` 2 brand tests failed, `reload.db.test.ts` brand test failed; GREEN: `@atika/db` 39 files / 271 tests, `save.test.ts` 19/19. Migration `20261023210000_brands` (table + partial unique index for the single fallback + backfill) applied locally; `prisma migrate diff` shows no drift.
  - Decisions: `Brand.key` = lower(trim(name)) is the identity; `Product.brand` stays text and is saved with the brand's stored spelling ("milonga" -> "Milonga"); `ensureBrand` (`@atika/db/brands`) creates new brands before the fallback; seed reload also registers brands; reserved slugs (`todos`, `pink`) get `-marca`; the seed's `clearImported` does not touch brands, so activation survives a re-seed.

## Next step

T2.
