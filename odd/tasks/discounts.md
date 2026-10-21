# Feature: discounts

## Objective

Let the owner create percentage discounts from the ERP, applied to every product or to a chosen set, and show them in the catalog and in sales.

## Decisions (defaults, 2026-10-21)

- Discount: name, percent (1–90, integer), active flag, optional start/end dates (inclusive, store-local Paraguay time), scope `all` or `selected` (explicit product list).
- Several active discounts on one product: the highest percent wins (no stacking).
- Applied on top of the formula price: `discounted = roundGs(priceGs × (1 − percent/100))`. The formula and `Product.priceGs` stay untouched.
- Catalog: original price struck through, discounted price, "-20 %" badge; WhatsApp message uses the discounted price. Applies to all catalog views (presentation pieces, lookbook catalogs, ver-todo rows/sheet, product page).
- ERP sales: "Registrar venta" suggests the discounted price (listPriceGs = discounted at sale time); existing sales unchanged.

## Scope

- Schema: `Discount` (id, name, percent, isActive, startsAt?, endsAt?, scope enum all|selected, timestamps) + `DiscountProduct` join (discountId, productId, unique pair, cascade). Migration.
- `@atika/pricing`: pure `applyDiscount(priceGs, percent)` and `bestDiscount(activeDiscounts, productId, now)`; tests.
- ERP `/descuentos`: list (name, %, scope, products count, dates, active switch), "Nuevo descuento" and edit page: fields + product picker (search, filter by lot/category, select all filtered, selected count) shown only when scope = selected. Sidebar entry "Descuentos". Every action `requireSession()` (guard test updated).
- Catalog + ERP sale form use the effective discount (server-side computation, catalog-safe: expose only percent and discounted price).

## Out of scope

- Coupon codes, fixed-amount discounts, per-size discounts, stacking.

## TDD

- Strict, Vitest; DB tests roll back.

## Tasks

- [x] T1 — Schema + migration + pricing helpers. Commit `69edf89`.
- [x] T2 — ERP discounts list/create/edit with product picker. Commit `69f2ef0`.
- [x] T3 — Catalog display + WhatsApp price. Commit `c580392`.
- [x] T4 — Sale form suggested price. Commit `efc9320`.

## Decisions taken while implementing

- Dates (`startsAt`, `endsAt`) are `@db.Date` columns (UTC midnight, like sales). `effectiveDiscount` compares them with the Asunción calendar day of `now`, both ends inclusive.
- `DiscountProduct` uses a composite primary key (`discountId`, `productId`) as the unique pair; cascade on both sides. Migration `20261022020000_discounts`.
- ERP: product picker filters on the client (all products are loaded once); selection survives filtering. Delete uses `window.confirm`, in the list and on the edit page. A "selected" discount needs at least one product.
- Catalog view models expose only `discountPercent` and `discountedPriceGs` next to `priceGs` (all three null when prices are hidden). Rules are loaded once per query (`loadDiscountRules`), nothing is read when prices are hidden.
- Price sort in the catalog still uses the list price (discounts of different percent could reorder otherwise).
- WhatsApp: size picker, row, sheet and product page messages append ` – ₲ X (-N %)` only when a discount applies; the cart stores the discounted unit price (plus `discountPercent`) and the order message shows it.
- ERP sale: `registerSale` computes the discounted price on the server at sale time (not trusted from the form); the form only shows it as a hint.

## Progress

- 2026-10-21: Document created.
- 2026-10-21: T1-T4 implemented, one commit per task.

## Verification evidence

RED recorded before each implementation (failing run, then GREEN):

- T1 pricing: `discount.test.ts` 12 failed (helpers missing) -> 27 passed. Schema test 2 failed (models missing) -> 188 passed in `@atika/db` after `prisma generate` + migration.
- T2: `schema.test.ts`/`save.test.ts`/`discounts.db.test.ts` failed on unresolved imports; `actions-guard.test.ts` module list failed (1 failed) and sidebar test failed (1 failed, "Descuentos" missing); component tests failed on unresolved imports -> 344 passed in `@atika/erp`.
- T3: 23 failed (view models, price helpers, components, DB queries) -> 203 passed in `@atika/catalog`.
- T4: 4 failed (register, sale form, sellable query) -> 349 passed in `@atika/erp`.

Repo root, final state:

- `pnpm lint`: 370 files, no errors (1 pre-existing warning in `next-path.ts`).
- `pnpm typecheck`: 6/6 tasks successful.
- `pnpm test`: ui 36, pricing 27, db 188, catalog 203, erp 349 tests passed.
- `env -u DATABASE_URL pnpm build`: 3/3 tasks successful; routes `/descuentos`, `/descuentos/nuevo`, `/descuentos/[id]` present.
- `pnpm db:migrate`: no pending migrations (applied once earlier, `20261022020000_discounts`).
- Runtime (production build on temporary ports 3100/3101, because the dev servers on 3000/3001 hold a Prisma client created before the new models and need a restart): a temporary 20 % discount on 2 published products showed `<s>` original price, discounted price and "-20 %" on `/ver-todo` and the lookbook pages (e.g. ₲ 3.093.000 -> ₲ 2.474.000), and `/descuentos` plus its edit page listed it ("2 productos", "20 %") with a temporary owner session. Discount and session were deleted afterwards (0 discounts, 0 temp sessions).

Gotcha: Vitest's fs module cache keeps the `import.meta.glob` result of `actions-guard.test.ts`; after adding a new `actions.ts` run `pnpm --filter @atika/erp exec vitest run --clearCache` once.

## Next step

Restart the dev servers on :3000 and :3001 (regenerated Prisma client), then review and open the PR.
