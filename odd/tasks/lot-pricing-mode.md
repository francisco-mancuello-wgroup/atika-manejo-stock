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

- [ ] T1 — DB: `pricingMode` enum + column + migration; schema test.
- [ ] T2 — Parámetros applies only to `global` lots (save, preview, count copy) with tests.
- [ ] T3 — Compras: mode switch, custom params form + save/reprice action, back-to-global action, "Difiere del global" flags, with tests.

## Acceptance criteria

- Saving Parámetros never changes a `custom` lot's params or prices.
- Editing a `custom` lot's params reprices only that lot's products.
- Switching a lot to Global sets its params to AppSettings and reprices.
- lint, typecheck and all package tests pass.

## Delivery

- Strategy: ask-on-risk. Forecast ~450 authored lines. RDD: off (global).

## Progress

- 2026-10-22: Document created (branch feat/lot-pricing-mode).

## Verification evidence

## Next step

T1.
