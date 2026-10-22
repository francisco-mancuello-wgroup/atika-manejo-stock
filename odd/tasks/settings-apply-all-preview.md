# Feature: settings-apply-all-preview

## Objective

Parámetros always applies to every lot, and lets the owner preview, lot by lot, how the prices come out with the values being typed before saving.

## Problem

The scope selector (new / selected / all) adds a decision the owner does not want: parameters must always define the price of every lot. What they need instead is to see the per-lot calculation before committing.

## Scope

- Remove the "Aplicar a" radio group, the lot checklist and the scope/lotIds handling (schema, save, action, tests). Saving always upserts the settings and reprices ALL lots in one transaction (each lot keeps only its own total shipping).
- One button "Aplicar" (pending "Aplicando…"). Summary line under it: "Se recalculan N lotes · M productos" (countOf singular/plural). Success: "Parámetros guardados. Se actualizaron N lotes y se recalcularon M precios." (singular aware).
- New panel "Ver cálculo por lote": a lot select, then a table for that lot with one row per product: Producto, Unidades compradas, Valor original (US$), Envío por unidad (US$), Costo unitario (US$), Precio actual, Precio nuevo, Diferencia. Computed client-side with `@atika/pricing` (priceLot) from the values currently in the form (live, unsaved) and the lot's shipping. Invalid/empty inputs -> the panel shows "Completá los parámetros para ver el cálculo." Prices respect the Gs | US$ display currency like the other views (stored price is ₲; US$ uses TC del día, same formatter as the rest).
- Formula block stays (numbered steps); its note says applying updates every lot.

## Decisions

- Always apply to all lots (user decision 2026-10-22).
- Preview uses the form's unsaved values (interpretation of "ver cómo queda por lotes los cálculos").

## TDD

- Strict, Vitest (`pnpm --filter @atika/erp test`).

## Tasks

- [x] T1 — Always-all apply: simplify schema/save/action/form, tests. Commit 97c5400.
- [x] T2 — Per-lot calculation preview panel (query for lot products with units and current price, client component using @atika/pricing), tests. Commit 042d9cd.

## Progress

- 2026-10-22: Whole preview header (title + hint) toggles the panel; "Buscar prenda" search filters the lot's products by name (case and accent insensitive; empty result -> "Ninguna prenda coincide con la búsqueda."). RED 2 failed; GREEN settings-forms 17/17.

- 2026-10-22: "Ver cálculo por lote" collapsed by default (heading button with aria-expanded/aria-controls, chevron, one-line hint when closed) per user feedback. RED 7 failed; GREEN settings-forms 15/15; erp 397/397, lint ok, tsc ok.

- 2026-10-22: Button label shortened to "Aplicar" (user request). RED 3 failed, GREEN settings-forms 14/14, tsc ok.

- 2026-10-22: Document created.
- 2026-10-22: T2 done (commit 042d9cd).
- 2026-10-22: T1 done (commit 97c5400).

## Verification evidence

- T1 RED: 9 tests failed (schema 2, form 5, save 2) before implementation. GREEN: settings/schema/form/actions tests 41 passed. `pnpm typecheck` ok, `pnpm lint` only the known next-path.ts warning.

- T2 RED: preview.test.ts failed to load, form tests 8 failed, DB query test failed before implementation. GREEN: `pnpm --filter @atika/erp test` 65 files / 396 tests passed; `pnpm typecheck` 6/6 ok; `pnpm lint` only the known next-path.ts warning.

## Next step

Done; ready for review/merge.
