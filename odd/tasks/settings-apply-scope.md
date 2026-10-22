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

## Out of scope

- Changing per-lot exchange rate, cost share or shipping from this page (still edited per lot).

## TDD

- Strict, Vitest (`pnpm --filter @atika/erp test`); DB tests roll back.

## Tasks

- [ ] T1 — Logic: schema for scope + lot ids, `saveAndApplySettings` (one transaction), tests; remove `applySettingsToAllLots` path.
- [ ] T2 — UI: single form with scope radios, lot checklist, live summary, formula reference; page + action wiring; tests; actions guard test updated.

## Progress

- 2026-10-22: Document created.

## Verification evidence

(pending)

## Next step

T1.
