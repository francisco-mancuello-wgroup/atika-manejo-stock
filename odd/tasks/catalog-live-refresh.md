# Feature: catalog-live-refresh

## Objective

Changes saved in the ERP show up instantly on open pages of the public catalog, without the visitor pressing F5.

## Problem / why

User request 2026-10-22: every ERP change needs F5 on the web. Catalog pages are already `force-dynamic` (fresh data per request), but an open page never learns that data changed. User wants it "al instante".

User decisions 2026-10-22:
- Instant (Supabase Realtime), not polling.
- Broadcast "something changed" signal only; no table is exposed through Supabase Realtime/RLS (data keeps flowing only through the server and Prisma).

## Scope

- ERP: `notifyCatalogChanged()` helper that sends a Supabase Realtime Broadcast (REST `POST {NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, public channel, no payload data). Fire-and-forget with short timeout; never fails or slows the ERP action; no-op when env vars are missing. Called after every successful mutation that affects what the catalog shows (products, variants, stock, prices, lots, groups, publication, promos, discounts, currency, parameters, bank data, sales, orders approval).
- Catalog: client `LiveRefresh` component in the root layout, subscribing with `@supabase/supabase-js` to the broadcast channel and calling `router.refresh()` throttled (burst-safe). No-op when env vars are missing.
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.example` (user already set them in `.env`).

## Constraints

- Code/comments English; no UI copy changes.
- Known limitation: changes made outside the ERP (seeds, manual SQL) do not notify. Possible later: DB trigger with `realtime.send`.
- Public channel: anyone with the publishable key could send the event; the throttle bounds the refresh rate.
- Vercel env vars for both projects are the user's to set (no remote ops authorized).

## TDD

- Strict (session config), Vitest: `pnpm --filter <pkg> test`. Observe RED before GREEN.

## Tasks

- [x] T1 — ERP: `notifyCatalogChanged` helper + tests; wire into catalog-affecting server actions.
- [ ] T2 — Catalog: `LiveRefresh` subscriber (throttled `router.refresh()`) in root layout + tests; env example.

## Progress / evidence

- Branch `feat/catalog-live-refresh` from main f89abca.
- T1 done: RED (module missing) -> GREEN `apps/erp/src/lib/catalog-live.test.ts` 8/8; notify wired in catalogo-web, compras/[lotId], datos-bancarios, inventario, parametros, promos/bancos, promos/descuentos, ventas, ventas/pedidos (approve only). Skipped: moneda (ERP display cookie), seguridad/login (auth), reject order (stock untouched). ERP suite: only DB-backed tests (settings/lots/catalog save) fail, flaky and also failing on base. Commit: see git log `feat(erp): notify catalog of changes`.

## Next step

T2.
