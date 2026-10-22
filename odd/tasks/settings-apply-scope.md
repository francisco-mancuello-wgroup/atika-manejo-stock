# Feature: settings-apply-scope

## Objective

Make `/parametros` a single, clear flow: edit the default values once, choose where they apply (only new lots, selected lots, or all lots), and confirm with one button.

## Problem

Today the page has two independent forms ("Guardar parámetros" and "Aplicar a todos los lotes"). The user must save first and apply second, and applying is all-or-nothing.

## Scope

- One form "Valores por defecto": TC, factor de venta, IVA (%), costo sobre valor original (%).
- "Aplicar a" radio group: "Solo lotes nuevos" (default, only saves), "Lotes seleccionados" (checkbox list of lots with product count), "Todos los lotes".
- Live summary before submitting: "Se recalculan N lotes · M productos" (or "Solo se guardan los valores por defecto").
- One submit button "Guardar y aplicar" (label "Guardar" when scope is new lots). Save and apply run in ONE transaction.
- Applying keeps current semantics: write the saved sale factor and IVA into each targeted lot and reprice its products; each lot keeps its own exchange rate, cost share and shipping.
- Validation: "Lotes seleccionados" with no lot checked -> error "Elegí al menos un lote."; unknown lot ids are rejected.
- Read-only formula reference on the page: envío por unidad = envío total del lote ÷ unidades compradas; costo unitario = valor original × % costo + envío por unidad; precio = costo × factor × (1 + IVA) × TC, redondeado a 1.000 ₲.

## Decisions

- Shipping stays prorated per unit (user decision 2026-10-22); no new shipping parameter.
- Parámetros is the ONLY place that defines prices (user decision 2026-10-22). Applying writes TC, factor, IVA and % costo into each targeted lot and reprices it.
- The lot's total shipping is purchase data (what the courier was paid), not a pricing parameter: it is edited in Compras, which never recalculates prices; Parámetros uses each lot's shipping when applying.

## Out of scope

- Changing per-lot exchange rate, cost share or shipping from this page (still edited per lot).

## TDD

- Strict, Vitest (`pnpm --filter @atika/erp test`); DB tests roll back.

## Tasks

- [x] T1 — Logic: schema for scope + lot ids, `saveAndApplySettings` (one transaction), tests; remove `applySettingsToAllLots` path. (commit: see git log, `feat(erp): save and apply settings to selected lots`)
- [x] T2 — UI: single form with scope radios, lot checklist, live summary, formula reference; page + action wiring; tests; actions guard test updated. (commit: `feat(erp): single parameters form with apply scope`)

## Progress

- 2026-10-22: T6 — Compras lot detail: pricing form and `saveLotParameters`/`parseLotParams` removed; read-only pricing block with link to /parametros; `LotShippingForm` + `saveLotShipping` + `saveLotShippingAction` save only `totalShippingUsd` (no repricing). T5 commit: b843a2f. Tests were written together with the code (no separate RED observed for T6); GREEN: erp suite, typecheck, lint (only pre-existing warnings).

- 2026-10-22: T5 — `saveAndApplySettings` passes saved TC, factor, IVA and % costo to `recalculateLot`; only shipping comes from the lot. Copy updated (page description, formula note). RED: save.test 2 failed (+ new copy test); GREEN: settings, settings-forms, app 44/44.

- 2026-10-22: T4 — singular/plural copy ("Se recalcula 1 lote · 12 productos", "Se actualizó 1 lote y se recalcularon 12 precios.", "1 producto" in the checklist) via `countOf` in lib/format. RED: 4 failed (format, save, settings-forms x2); GREEN: erp 372/372, lint ok (pre-existing warning), tsc ok.

- 2026-10-22: T3 — formula block redesigned as numbered steps (label, formula, rounding note) after user feedback ("más limpio y profesional"). RED: `vitest run src/components/settings-forms` 1 failed (no list named "Cómo se calcula el precio"); GREEN 6/6; tsc ok.

- 2026-10-22: Document created.
- 2026-10-22: T1 done. `saveAndApplySettings(db, raw, lotIds)` replaces `saveAppSettings` and `applySettingsToAllLots`; `applyToAllLotsAction` removed. The page/component still reference the old action until T2 (typecheck red between T1 and T2).
- 2026-10-22: T2 done. `SettingsForm` (single form), `getLotsForSettings` query, page wired. Actions guard test unchanged (still enumerates the same modules; the removed action is simply gone).

- [x] T3 — Cleaner formula block (numbered steps). See commit after 819d8a1.

- [x] T4 — Singular/plural copy in summary, checklist and success message.

- [x] T5 (commit: `feat(erp): apply every pricing parameter from Parámetros`) — Apply scope writes all four pricing params (TC, factor, IVA, % costo) to targeted lots; each lot keeps only its shipping. Update copy (page description, formula note, summary/success texts if needed).
- [x] T6 (commit: `feat(erp): compras edits lot shipping only`) — Compras lot detail: remove the pricing form ("Parámetros del lote" / "Guardar y recalcular"). Show the lot's pricing values read-only with a link to Parámetros, plus one editable "Envío total (US$)" that saves only the lot's shipping (no repricing) and says prices update when applied from Parámetros.

## Verification evidence

- T1 RED: `vitest run src/lib/settings` -> 11 failed | 1 passed (missing scope/lotIds, `saveAndApplySettings` not exported).
- T1 GREEN: `vitest run src/lib/settings src/app` -> 6 files, 37 tests passed (DB tests ran against local Postgres, rolled back).
- T2 RED: `vitest run src/components/settings-forms` -> 6 failed (SettingsForm not exported).
- T2 GREEN: `pnpm --filter @atika/erp test` -> 58 files, 371 tests passed. `pnpm lint` -> only the pre-existing next-path.ts warning. `pnpm typecheck` -> 6/6 tasks successful.
- The `getLotsForSettings` DB test was written alongside its implementation (no separate RED observed).

## Next step

Review / delivery (push and PR are the user's decision).
