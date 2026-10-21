# Feature: catalog-tablet-rows

## Objective

Replace the public catalog grid with the tablet-first row layout of Propuesta C (`odd/specs/catalog-tablet-c.md`): category rail, size filter, sort, search, product rows and a detail sheet with WhatsApp contact.

## Problem

The catalog is a 4-column grid designed for desktop; the store uses it mainly on a tablet.

## Scope

- Layout by width: landscape (≥1024) with left rail; portrait (640–1023) with category tabs and size chips row; phone (<640) compact.
- Filtering through URL search params (shareable, server-rendered): category (existing `/[categoria]` routes, `novedades` = all), `talle` (only products with stock in that size), `q` (name/brand search), `orden` (`recientes` default, `precio-asc`, `precio-desc`). Category counts in the rail honor the current size filter and catalog settings.
- Product rows per spec; detail sheet opened by `?p=<productId>` (server-rendered, deep-linkable, close = same URL without `p`; Escape and scrim click close it on the client); size selection inside the sheet (client) and WhatsApp link via the existing `buildWhatsappUrl`.
- `/producto/[id]` keeps working (full page) for direct links.
- Remove the grid card component if unused.

## Out of scope

- Infinite scroll / pagination (113 products render fine; revisit later).
- ERP changes.

## Constraints

- Catalog never exposes costs, lots data, stock counts or sales (keep the safety tests; detail line may use color/description only).
- Builds pass without `DATABASE_URL`; data pages dynamic.
- Accessibility: rows are buttons/links with accessible names; sheet is a dialog (`role="dialog"`, `aria-modal`, labelled by the product name, focus moves into it and returns on close).

## TDD

- Mode: strict. Runner: Vitest + Testing Library.

## Delivery

- Stacked-to-main. Branch `feat/catalog-tablet-rows`. Commits per task.

## Tasks

- [x] T1 — Query layer: filters (talle, q, orden) + category counts; tests. Commit 928bdfd.
- [x] T2 — Layout: topbar with search, rail (landscape) / tabs + chips (portrait/phone), list header with count and sort. Commit 82cfdb7.
- [x] T3 — Product rows per spec. Commit ceca019.
- [x] T4 — Detail sheet (`?p=`) with size selection and WhatsApp. Commit 23bc590.

## Progress

- 2026-10-21: Document created; user approved Propuesta C ("me gusta, implementalo").

## Verification evidence

Resolved TDD: strict, Vitest + Testing Library (`apps/catalog`, `npx vitest run`).

RED observed before each implementation:

- T1: `catalog-filters.test.ts` failed to import; 12 tests failed across `catalog-filters`, `catalog-view` (detail line, sheet detail, key lists) and `queries.db` (filters, counts, `getProductDetail` "is not a function"). GREEN: 43 tests in `src/lib` (DB-backed tests run in rolled-back transactions).
- T2: `catalog-layout.test.tsx` failed to import; 6 topbar tests failed (nav still present, no search box); 7 page tests failed (no rail, filters not forwarded, no empty-state link). GREEN: 96 catalog tests.
- T3: `product-rows.test.tsx` failed to import. GREEN: 100 catalog tests.
- T4: `product-sheet.test.tsx` failed to import; page test for `?p=` failed (`getProductDetail` never called). GREEN: 115 catalog tests.

Final checks (repo root): `pnpm exec biome check apps packages` clean; `pnpm typecheck` 6/6; `pnpm test` 6/6 packages (catalog 115 tests, erp 153, db 76, ui 34, pricing 15); `env -u DATABASE_URL pnpm build` ok, routes `/`, `/[categoria]`, `/producto/[id]` dynamic. `pnpm lint` (whole repo) is blocked by an untracked nested `.claude/worktrees/*/biome.json` that is not part of this change.

Manual checks against the local database (113 published products, 40 given temporary categories and restored to none afterwards): `?talle=S`, `?talle=XL` (empty state), `?q=aros`, `?q=zzzz`, `?orden=precio-asc`, `/tops?talle=S&orden=precio-desc`, invalid `talle`/`orden` (fall back to no filter), unknown `?p=` (no sheet), `/producto/[id]` (still renders).

Screenshots (headless Chrome, reviewed against `odd/specs/catalog-tablet-c.md`):

- 1180x820: topbar with centered search and WhatsApp button; 220px rail with category counts, size grid and note; Cormorant title with count and sort control; rows with offset photo, eyebrow, name, size chips, price + "IVA incluido" column and 56px green WhatsApp button. With `?p=`: scrim and 480px sheet from the right with thumbnails, photo, name, price, size buttons, description and full-width WhatsApp button.
- 820x1180: search icon button, category tabs, title with count and sort, size chip row ("Todos" first), compact rows with name and price on one line and a "Consultar" button; sheet 560px max.
- 390x844: same as portrait with tighter padding and horizontally scrollable tabs and chips; sheet full width.

## Decisions

- Sheet is a client component (`product-sheet.tsx`) rendered by the server page when `?p=` resolves to a visible product; scrim and close button are plain links (work before hydration), Escape uses `router.replace`, focus moves in and returns to the opener, Tab is trapped, page scroll locked.
- Row link is the product name stretched over the row (`after:absolute`), so the WhatsApp anchor is a sibling, never nested.
- Search lives in the layout topbar as a client form that reads the pathname and URL params to stay in the current category and keep `talle` and `orden`.
- `ProductGrid` and `ProductCard` (and their tests) were removed: `/producto/[id]` does not use them. `ProductContact` stays for `/producto/[id]`. The home hero text setting is no longer rendered on the catalog.
- Price sort is ignored when prices are hidden (it would leak the order).
- `CatalogProduct` gained `detail` (color and clipped description); `CatalogProductDetail` adds color, description and photos named after the product (ERP alt text not published). Safety tests extended.

## Next step

Review, then merge `feat/catalog-tablet-rows` (stacked-to-main).
