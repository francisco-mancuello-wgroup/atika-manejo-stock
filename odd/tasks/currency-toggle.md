# Feature: currency-toggle

## Objective

A global "Gs | US$" pill toggle in the ERP that switches every displayed amount between guaraníes and US dollars.

## Reference

User screenshot 2026-10-22 08:25: rounded pill with two segments "Gs" and "US$"; the active one is filled (light background, dark text), the other is muted text on the dark surface.

## Scope

- Toggle visible on every ERP page (top of the content area or sidebar, near the TC del día), keyboard accessible (`role="group"` aria-label "Moneda", buttons with `aria-pressed`).
- Choice persisted in a cookie (`currency=gs|usd`, default gs) so server components render the right currency and it survives navigation and reloads.
- Display-only conversion of money amounts in list/summary views: Inventario, Ventas, Resumen, Compras (list + lot detail), Catálogo web. Conversion uses the TC del día from Parámetros (AppSettings.exchangeRate). If no TC is saved, the toggle stays on Gs and US$ is disabled.
- Amounts natively in US$ (original value, shipping) keep showing in US$ when the Gs mode is on only if that is how they show today; the toggle converts Gs amounts (prices, sales, stock value, margins) to US$ and back.
- Form inputs keep their native currency (valor original US$, precio cobrado ₲, envío US$). No stored data changes.

## Decisions

- Conversion rate: TC del día from Parámetros (consistent with Parámetros being the single price source).

## TDD

- Strict, Vitest (`pnpm --filter @atika/erp test`).

## Tasks

- [ ] T1 — Currency model: cookie read/write (server action or route), `formatMoney(amountGs, currency, rate)` helper in lib/format, tests.
- [ ] T2 — Toggle UI (pill like the reference) in the ERP layout + wire every display view to the selected currency; tests.

## Progress

- 2026-10-22: Document created.

## Verification evidence

(pending)

## Next step

T1.
