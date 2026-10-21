# Feature: catalog-web

## Objective

Finish the ERP sections "Catálogo web" and "Parámetros" and make the public catalog show real, published products with a prefilled WhatsApp contact.

## Problem

Both ERP sections are placeholders, and the public catalog does not read the database. Products are imported with `isPublished = false` and no category.

## Scope

- Schema: `AppSettings` singleton (id = 1) with the exchange rate of the day and default lot parameters (sale factor, IVA, cost %); migration + seed default row.
- ERP **Parámetros**: edit exchange rate of the day and defaults; optional "Aplicar a todos los lotes" that writes factor/IVA to every lot and recalculates prices (reuse the existing lot recalculation). Sidebar "TC DEL DÍA" reads `AppSettings`.
- ERP **Catálogo web** (reference: B · ERP · Catálogo web in `atika.pen`): product list with filters (Todos / Visibles / Ocultos / Sin stock) and search; per product: visible toggle and category select (Vestidos, Tops, Faldas y shorts, Accesorios, or none); bulk "Publicar todos con stock"; settings form for `CatalogSettings` (WhatsApp number, message template with `{producto}` and `{talle}`, hero text, switches: mostrar precios, mostrar talles agotados, ocultar productos sin stock). Changes apply immediately (no drafts).
- **Public catalog** (reference: B · Catálogo screens): home grid of published products (newest first) honoring `hideOutOfStock`; category pages filter by category (`novedades` = all published, newest first); product page `/producto/[id]` with available sizes (sold-out sizes struck through only if `showSoldOutSizes`), price only if `showPrices` (else "Consultar precio"), size selection and a "Consultar por WhatsApp" link `https://wa.me/<digits>?text=<template filled>`; topbar "Escribinos" uses the configured number. Photo area: sand placeholder until photos exist.

## Out of scope

- Photo upload/storage (needs a storage decision).
- Product editing beyond visibility and category; login.

## Constraints

- UI copy in Spanish; code in English. Catalog never exposes costs, lots, suppliers or stock counts — only availability per size.
- Builds must pass without `DATABASE_URL`; data pages render dynamically.
- Tests that touch the DB roll back; the seeded data must stay intact (123 products, 193 variants, 20 sales, Σ stock 217) apart from the new `AppSettings` row.

## TDD

- Mode: strict (session config). Runner: Vitest.

## Delivery

- Strategy: stacked-to-main. Branch `feat/catalog-web`. One commit per task.

## Tasks

- [x] T1 — `AppSettings` model, migration, seed row; ERP Parámetros page + sidebar TC from DB. Commit `b33403b`.
- [x] T2 — ERP Catálogo web: list, filters, visibility toggle, category select, bulk publish, settings form. Commit `2139a78`.
- [x] T3 — Catalog data layer (server-only, catalog-safe view models) + home grid + category pages. Commit `972341d`.
- [x] T4 — Product page with size selection and WhatsApp link; topbar number from settings. Commit `4b626ab`.

## Decisions

- Categories live in `packages/db/src/categories.ts` (`CATALOG_CATEGORIES`, imported as `@atika/db/categories`): it is the vocabulary of the `Product.category` column, has no runtime dependencies (safe in client components and tests of both apps), and `packages/ui` is for presentation. The catalog prepends "Novedades".
- `AppSettings` is only created by the seed when missing (edits made in the ERP survive a reseed). "Aplicar a todos los lotes" writes the saved sale factor and IVA to every lot and reprices; each lot keeps its own exchange rate, cost share and shipping.
- Catalog safety: queries `select` only id, name, category, price and variant size/stock; `toCatalogProduct` builds the public shape field by field (availability per size, never counts). Covered by `catalog-view.test.ts` and `queries.db.test.ts`.
- WhatsApp without a chosen size: the size clause of the template ("en talle {talle}") is dropped and the rest is kept; a bare `{talle}` is removed. With a size, all placeholders are filled.

## Progress

- 2026-10-21: Document created after the user saw both ERP sections as placeholders.
- 2026-10-21: T1–T4 implemented by one writer with strict TDD (tests first, RED observed, then GREEN).

## Verification evidence

RED observed before implementation (module missing or assertions failing):
- T1: `settings/schema.test.ts`, `settings/save.test.ts` failed to import `./schema` / `./save`; `sidebar.test.tsx` 2 failed (exchange rate prop), `settings-forms.test.tsx` unresolved import.
- T2: `catalog/filters|schema|save` tests and `queries/catalog.db.test.ts` unresolved imports (4 files failed); `product-controls` and `catalogo-web-view` tests unresolved (2 files failed). The `packages/db` categories test was written together with its module (no separate RED).
- T3: `catalog-view` and `queries.db` tests unresolved; `product-card`/`product-grid` unresolved; home and category page tests failed (8 failed tests).
- T4: `whatsapp`, `product-contact`, product page tests unresolved; `topbar` number test failed.

GREEN (repo root, foreground):
- `pnpm lint`: Checked 185 files, no fixes, no errors.
- `pnpm typecheck`: passes in every package.
- `pnpm test`: ui 34, pricing 15, db 43, catalog 48, erp 142 tests passed.
- `env -u DATABASE_URL pnpm build`: 3 of 3 tasks successful; all data pages dynamic.
- `pnpm db:migrate`: applied `20261021120000_app_settings`, then "No pending migrations".
- `pnpm db:seed` twice: both runs succeeded; AppSettings and CatalogSettings stay at 1 row each.
- Runtime (production servers on ports 3100/3101, because 3000/3001 were already taken by other dev servers): ERP `/parametros`, `/catalogo-web` (also with filters) and catalog `/`, `/vestidos`, `/novedades` returned 200 with data. After publishing one product through the DB: `/vestidos` listed it with price, `/tops` showed the empty state, `/producto/<id>` returned 200 with "IVA incluido" and a `https://wa.me/595981000000?text=...` link, `/producto/nope` returned 404, and the topbar link was `https://wa.me/595981000000`. Data restored with `pnpm db:seed`.
- Final DB: 123 products, 193 variants, 20 sales, stock sum 217, 1 AppSettings row, 1 CatalogSettings row, 0 published products.

## Limitations

- No product photos yet (sand placeholder); Pencil screens were not read, so card and page layout follow the written spec and existing tokens.
- Dev servers already running on 3000/3001 must be restarted to pick up the regenerated Prisma client (the old ERP dev server returned 500 on `/parametros`).

## Next step

Merge to `main`.
