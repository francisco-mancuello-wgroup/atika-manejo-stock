# Feature: erp-products

## Objective

Edit existing products and create new ones from the ERP. The price the owner edits is the original value in US$, which always goes through the lot formula.

## Problem

Products can only change through the seed; the owner needs to fix codes, names and prices and add new pieces.

## Decisions (user, 2026-10-21)

- Editing the price = editing `originalValueUsd`; `priceGs` is always recomputed with `@atika/pricing` (`priceLot`) for the whole lot (shipping is prorated over units bought, so unit changes affect every product of the lot).
- Prices ALWAYS use the lot formula. The fixed US$ sale price (`salePriceUsd`) was removed entirely (T0): column dropped, lookbook field, "US$ fijo" display and seed handling gone. No warning, no "Usar la fórmula".
- The pages are plain forms: fields + "Guardar" and a "Cancelar" link. The editable price field is "Valor original US$"; "Costo u. (US$)" and "Precio (₲)" are read-only, computed live in the client with `@atika/pricing` from the lot parameters and lot units; on save the whole lot is recalculated server-side.
- Photos are editable: upload (jpg/png/webp, max 10 MB, MIME + magic bytes), remove, choose cover (radio "Portada"); optimized with sharp to WebP (max 1600 px, q82), stored on local disk in `apps/erp/public/media/products/uploads/<productId>/` and `apps/catalog/public/...` (gitignored) behind the `PhotoStorage` interface (`saveProductPhoto`, `deleteProductPhoto`) so it can move to cloud storage. Re-seeding recreates products from the workbooks and does not preserve uploads or ERP edits (documented in `packages/db/seed/README.md`).

## Scope

- `/inventario/[id]` edit page: code, name, brand, color, category, description, original value US$, sizes table (size, units bought, stock; add size; remove a size only if it has no sales), live price preview (unit cost, price ₲) before saving.
- `/inventario/nuevo`: choose lot, same fields, at least one size; new products start hidden in the catalog.
- Save = one transaction: update product + variants, then recalculate every product price of the lot.
- Inventory list rows link to the edit page; "Nuevo producto" button.
- Validation (Zod): required name, positive original value, integer units/stock ≥ 0, stock ≤ units bought, unique size per product, known sizes (XS, XS/S, S, M, M/L, L, XL, U).
- Every Server Action guarded with `requireSession()` (the actions guard test must include the new module).

## Out of scope

- Photo upload, deleting products, editing lots/suppliers.

## TDD

- Strict, Vitest. DB tests roll back.

## Tasks

- [x] T0 — Remove the fixed US$ price everywhere (pricing, ERP, seed, schema migration, data). Commit `316f4e0`.
- [x] T1 — Product schema/validation + save/create logic with lot recalculation and photos (tests). Commit `f084d27`.
- [x] T2 — Edit page with live cost/price and photos. Commit `71f03a9`.
- [x] T3 — New product page; inventory links and "Nuevo producto". Commit `851ef2d`.

## Progress

- 2026-10-21: Document created; user chose option 1 (price = original value through the formula).
- 2026-10-21: Scope changes by the user: fixed US$ price removed (T0), plain forms with read-only live price, editable photos. All tasks done.

## Verification evidence

- T0 RED: after removing `salePriceUsd` from the tests, `schema.test.ts` (2) and `catalogo-web-view.test.tsx` (1) failed (3 failed, 49 passed); GREEN after the source change. Migration `20261022010000_drop_sale_price_usd` applied with `pnpm db:migrate`; Átika lot recalculated with `recalculateLot` (28 products). Sordo prices before -> after (₲): Cubagua Oro 24KT 2.812.000 -> 3.093.000; Oriente 3.256.000 -> 3.582.000; Puerto Asymmetric Oro 1.208.000 -> 2.768.000; Puerto Asymmetric Plata 1.208.000 -> 2.768.000; Earcuff Cubagua Oro Large 2.368.000 -> 2.116.000; Earcuff Cubagua Oro Small 1.480.000 -> 2.768.000; Earcuff Cubagua Plata Small 1.480.000 -> 3.256.000; Earcuff Cubagua Doble Plata 1.350.000 -> 3.093.000.
- T1 RED: `vitest run src/lib/products` -> 4 test files failed (modules `./schema`, `./preview`, `./photos`, `./save` missing); GREEN 32 tests.
- T2 RED: `product-form`, `form-data`, `local-photo-storage` tests failed (modules missing); GREEN with the implementation (10 form tests).
- T3 RED: "links each product to its edit page and offers a new product button" failed; GREEN after the change.
- `pnpm lint`: pass (1 pre-existing warning in `next-path.ts`). `pnpm typecheck`: 6/6 pass. `pnpm test`: pricing 15, ui 36, db 187, catalog 175, erp 287 all pass (DB tests run in rolled-back transactions). `env -u DATABASE_URL pnpm build`: 3/3 pass, routes `/inventario`, `/inventario/[id]`, `/inventario/nuevo` built.
- Runtime on :3001 with a temporary user/session (deleted afterwards): `/inventario/<id>` 200, `/inventario/nuevo` 200, `/inventario` 200, unknown id 404; without cookie all 307 to `/login?next=...`.

## Next step

Review and merge decision by the user.
