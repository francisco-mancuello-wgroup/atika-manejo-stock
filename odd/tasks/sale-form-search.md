# Feature: sale-form-search

## Objective

Recording a sale in the ERP (/ventas, "Registrar venta") is fast: the product is found with a search (or a scanned size barcode), and the charged price is prefilled.

## Problem / why

User request 2026-10-22: registering a sale is tedious ("lo busco, selecciono y cargo otra vez el precio"). Today the product is a plain `<select>` with every sellable product; many labels repeat ("Bot Amar A · Milonga" ×7) because colour/code are not shown; and "Precio cobrado por unidad" starts empty, so the owner types the price again.

## Scope

- T1 Search: replace the product `<select>` with a searchable picker (type to filter by name, catalog name, colour, code, brand, lot; accent/case insensitive). Labels disambiguate repeated names (colour and/or code). Typing or scanning an exact size barcode (`AT…`, from feature variant-barcodes) selects that product AND its size. Keyboard usable (arrows/Enter), works with a USB scanner (types + Enter must not submit the sale form by accident).
- T2 Price prefill: when a product is chosen, "Precio cobrado por unidad (₲)" is filled with today's list price (discounted price when a discount applies); editable. If the submitted value equals the sale's list price, store `chargedGs = null` (same meaning as today: charged the list price), so reports are unchanged. After a successful sale the form resets as today.

## Constraints

- UI copy Spanish (voseo); code/comments English.
- Server stays the source of truth for list price/discount (`register.ts`); the prefill is a convenience.
- Only products/sizes with stock are offered (as today).

## TDD

- Strict (session config), Vitest: `pnpm --filter @atika/erp test` / `pnpm exec vitest run <files>` in apps/erp; DB tests use `withRollback`. Observe RED before GREEN.

## Tasks

- [x] T1 — Searchable product picker with disambiguated labels and barcode → product + size selection, tests.
- [x] T2 — Charged price prefilled with today's list price; equal value stored as list price (`chargedGs` null), tests.

## Acceptance criteria

- Typing part of a name/colour/code narrows the list; choosing an option selects the product.
- Scanning a size barcode selects product and size.
- Choosing a product fills the price; editing it records the edited price; leaving it records the list price (`chargedGs` null).
- lint, typecheck, ERP tests and build pass.

## Delivery

- Strategy: ask-on-risk. Forecast ~350 authored lines. RDD: off (global).

## Progress

- 2026-10-22: Document created (branch feat/sale-form-search from main 133f327).
- 2026-10-22: T1 done (a3cf232): `sale-product-picker.tsx` ARIA combobox, `lib/sales/product-search.ts`, `SellableProduct` extended. T2 done (0f5747d): price prefill, equal-to-list stored as null.

## Verification evidence

- T1 RED: `pnpm exec vitest run src/lib/sales/product-search.test.ts` failed (module missing); `src/components/sale-form.test.tsx` 11 failed / 2 passed. GREEN: both files pass (50 tests with `src/lib/sales`). Commit a3cf232.
- T2 RED: sale-form price tests (3) and `register.test.ts` (2) failed. GREEN: `vitest run src/lib/sales src/components/sale-form.test.tsx` 54 passed. Commit 0f5747d.
- Final: `pnpm lint` ok (2 known warnings); `pnpm typecheck` ok; `pnpm --filter @atika/erp test` 768 passed (106 files, none skipped); `pnpm --filter @atika/erp build` ok.
- Note: existing `product-picker.tsx` (discounts/promos) is unrelated, so the sale picker is `sale-product-picker.tsx`.

## Next step

Review and open a PR (user decision).
