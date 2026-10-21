# Feature: erp-products

## Objective

Edit existing products and create new ones from the ERP. The price the owner edits is the original value in US$, which always goes through the lot formula.

## Problem

Products can only change through the seed; the owner needs to fix codes, names and prices and add new pieces.

## Decisions (user, 2026-10-21)

- Editing the price = editing `originalValueUsd`; `priceGs` is always recomputed with `@atika/pricing` (`priceLot`) for the whole lot (shipping is prorated over units bought, so unit changes affect every product of the lot).
- The fixed US$ sale price (`salePriceUsd`, added by Francisco) is kept as is; when a product has it, the edit page warns that the formula is bypassed and offers "Usar la fórmula" (clears `salePriceUsd` and recalculates).

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

- [ ] T1 — Product schema/validation + save/create logic with lot recalculation (tests).
- [ ] T2 — Edit page with price preview, fixed-price notice.
- [ ] T3 — New product page; inventory links.

## Progress

- 2026-10-21: Document created; user chose option 1 (price = original value through the formula).

## Verification evidence

_None yet._

## Next step

Delegate.
