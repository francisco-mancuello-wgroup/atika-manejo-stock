# Feature: lot-pricing-mode

## Objective

Let each lot choose its pricing parameters: follow the global values from Parámetros, or use its own values edited in Compras.

## Problem / why

Today saving /parametros overwrites TC, factor, IVA and % costo on every lot. The owner needs some lots priced with their own parameters (for example a lot bought at a different exchange rate) while the rest follow the global values. This partly reverses the 2026-10-22 decision "Parámetros is the only price source" (user decision, same day).

## Scope

- `Lot.pricingMode` enum `global | custom`, default `global` (migration; existing lots become `global`).
- Mode is per whole lot: the 4 values (TC, factor, IVA, % costo) together. Shipping total stays per lot in both modes.
- Saving /parametros upserts AppSettings and recalculates only `global` lots; `custom` lots are untouched. Preview and header copy reflect it ("Se aplica a N de M lotes").
- Compras lot detail: mode switch (Global / Propio). Propio shows an editable form for the 4 values that saves and reprices the lot; values differing from global are flagged ("Difiere del global"). Switching back to Global copies AppSettings into the lot and reprices.
- Catalog unchanged (reads stored `priceGs`).

## Constraints

- One pricing function (`@atika/pricing`), one DB writer (`recalculateLot`).
- UI copy Spanish (voseo); code/comments English.
- Percent in forms, fractions in DB (reuse settings schema parsing).

## TDD

- Strict, Vitest (`pnpm --filter <pkg> test`); DB tests roll back. Observe RED before GREEN.

## Tasks

- [x] T1 — DB: `pricingMode` enum + column + migration; schema test. (commit: see Verification evidence)
- [x] T2 — Parámetros applies only to `global` lots (save, preview, count copy) with tests.
- [x] T3 — Compras: mode switch, custom params form + save/reprice action, back-to-global action, "Difiere del global" flags, with tests.

- [x] T4 — Saving the lot shipping reprices the lot with its current parameters (user request after review: the old message pointed to Parámetros, misleading for Propio lots).
- [x] T5 — "Activo: Global/Propio" tag next to the Precios del lote title (user request after trying the UI).

## Acceptance criteria

- Saving Parámetros never changes a `custom` lot's params or prices.
- Editing a `custom` lot's params reprices only that lot's products.
- Switching a lot to Global sets its params to AppSettings and reprices.
- lint, typecheck and all package tests pass.

## Delivery

- Strategy: ask-on-risk. Forecast ~450 authored lines. RDD: off (global).

## Progress

- 2026-10-22: Document created (branch feat/lot-pricing-mode).
- 2026-10-22: T1 done.
- 2026-10-22: T3 done (Compras Global/Propio switch, own-params form with "Difiere del global", actions `saveLotParamsAction` / `setLotPricingModeAction`).
- 2026-10-22: T2 done (save, preview and copy limited to `global` lots; `PreviewLot.pricingMode`).

## Verification evidence

- T1 RED: `pnpm --filter @atika/db test` -> 1 failed (`expected LotScalarFieldEnum to include 'pricingMode'`).
- T1 GREEN: migration `20261022040000_lot_pricing_mode` applied to local DB (`pnpm db:migrate`), client regenerated; `pnpm --filter @atika/db test` -> 205 passed.
- T2 RED: `pnpm exec vitest run src/lib/settings src/components/settings-forms.test.tsx` (apps/erp) -> 3 failed (new copy, `Se recalculan 2 de 3 lotes`, custom lot untouched message/prices).
- T2 GREEN: same command + `src/components` -> 171 passed; `pnpm typecheck` ok.
- T3 RED: `pnpm exec vitest run src/components/lot-pricing-panel.test.tsx src/components/lot-detail-view.test.tsx src/lib/lots/pricing-mode.test.ts src/lib/view-models.test.ts` (apps/erp) -> modules `./lot-pricing-panel` and `./pricing-mode` unresolved; view-model `pricingMode` undefined; lot detail missing `Guardar y recalcular` for a custom lot.
- T3 GREEN: `pnpm --filter @atika/erp test` -> 82 files / 554 tests passed; typecheck and lint ok.
- Decision (superseded by T4): `saveLotShipping` kept its behavior (no reprice) and message.
- Parent spot check: `pnpm --filter @atika/erp test` -> 82 files / 554 passed. Native risk assess (base main, committed-only): medium; RDD off, so no review ran. Branch total ~1000 authored lines (over the ~400 budget); no PR planned, user decides delivery.

- T4 RED: `pnpm exec vitest run src/lib/lots/save.test.ts` (apps/erp) -> 1 failed (message + price not repriced).
- T4 GREEN: lots + shipping form tests 28 passed; `pnpm --filter @atika/erp test` 554 passed; typecheck 6/6; lint ok (2 known warnings).
- T5 RED: lot-pricing-panel.test.tsx -> 2 failed (no "Activo: …" tag). GREEN: panel + lot detail tests 14 passed; biome clean; erp typecheck ok.

## Next step

Merge/push decision (user).
