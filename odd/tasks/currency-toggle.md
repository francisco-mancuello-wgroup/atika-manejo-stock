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

- [x] T1 (1c89874) — Currency model: cookie read/write (server action or route), `formatMoney(amountGs, currency, rate)` helper in lib/format, tests.
- [x] T2 — Toggle UI (pill like the reference) in the ERP layout + wire every display view to the selected currency; tests.

## Progress

- 2026-10-22: Document created.
- 2026-10-22: T1 done (lib/currency.ts, formatMoney/moneyFormatter, display-currency.ts, moneda/actions.ts).
- 2026-10-22: T2 done: CurrencyToggle (fieldset group) top-right of the ERP layout main area; views take `display` prop. Native-US$ lot investment leads with its stored value instead of re-converting.

## Verification evidence

- T1 RED: `vitest run currency.test.ts moneda/` failed with "Failed to resolve import ./currency / ./actions" (2 files failed). GREEN: `pnpm --filter @atika/erp test` 62 files / 380 tests pass; `pnpm lint` only the known next-path.ts warning; `pnpm typecheck` ok.

- T2 RED: `vitest run src/components/currency` failed: currency-toggle.test could not resolve ./currency-toggle and 6 currency-display tests failed (views ignored `display`). GREEN: `pnpm --filter @atika/erp test` 64 files / 390 tests pass; `pnpm lint` only the known warning; `pnpm typecheck` ok.

## Next step

Done; open decision gaps listed in the hand-off (investment pair, TC column, forms).
