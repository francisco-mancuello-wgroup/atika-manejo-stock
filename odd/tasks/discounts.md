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

- [ ] T1 — Schema + migration + pricing helpers.
- [ ] T2 — ERP discounts list/create/edit with product picker.
- [ ] T3 — Catalog display + WhatsApp price.
- [ ] T4 — Sale form suggested price.

## Progress

- 2026-10-21: Document created.

## Verification evidence

_None yet._

## Next step

Delegate.
