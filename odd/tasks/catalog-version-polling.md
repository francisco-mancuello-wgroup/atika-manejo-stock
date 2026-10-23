# Feature: catalog-version-polling

## Objective

ERP changes reach open catalog pages within a few seconds without depending on Supabase Realtime.

## Problem / why

User decision 2026-10-23: drop the Supabase Realtime dependency (catalog-live-refresh). On Vercel the ERP function cannot reach SSE/WebSocket connections held by catalog instances without a shared bus, so the bus is a version counter in our own Postgres, read by a CDN-cached endpoint. Accepted latency: 3-5 s.

## Scope

- DB: single-row `CatalogVersion` model (id = 1, `version Int`, `updatedAt`), table `catalog_version`, hand-written migration in `packages/db/prisma/migrations/`.
- ERP: `sendCatalogChanged()` in `apps/erp/src/lib/catalog-live.ts` upserts and increments the version via Prisma instead of the Supabase REST broadcast. Same contract: never throws, runs in `after()`. Call sites unchanged.
- Catalog: `GET /api/catalog-version` returns `{ version }`; CDN-cached ~2 s (`CDN-Cache-Control`), browser `no-store`. `LiveRefresh` polls it every ~4 s while the tab is visible, checks immediately on becoming visible, and calls `router.refresh()` when the version differs from the last one seen.
- Remove `@supabase/supabase-js` from the catalog and the `NEXT_PUBLIC_SUPABASE_*` vars from `.env.example` if nothing else uses them.

## Constraints

- Code/comments English, no UI copy changes.
- Applying the migration to the remote DB is the user's call (no remote ops authorized).
- Changes outside the ERP (seeds, manual SQL) still do not notify.

## Tasks

- [x] T1 — DB model + migration; ERP `sendCatalogChanged` increments the version + tests.
- [x] T2 — Catalog endpoint + polling `LiveRefresh` + tests; drop Supabase client dep and env vars.

## Progress / evidence

- Branch `feat/avances`.
- T1 done, commit c1f9946 (author fvera): `pnpm --filter @atika/db db:generate` + `db:validate` OK; `pnpm exec vitest run catalog-live` in apps/erp 4/4 pass; `pnpm --filter @atika/erp typecheck` OK; biome check on touched files clean. Migration `20261023100000_catalog_version` written, NOT applied (user's call). Full ERP suite has 1 pre-existing failure (`actions-guard.test.ts` "finds every action module"), reproduced on a clean stash.
- T2 done, commit bea6a31 (author fvera): `pnpm exec vitest run live-refresh` in apps/catalog 8/8 pass; `pnpm --filter @atika/catalog typecheck` OK; biome clean on touched files; `pnpm install` removed `@supabase/supabase-js` (-8 packages), no other users found with `rg`. Header choice (`Cache-Control: no-store`, `CDN-Cache-Control: public, s-maxage=2, stale-while-revalidate=5`) verified 2026-10-23 against Vercel CDN cache docs: `CDN-Cache-Control` drives the CDN, browser keeps `no-store`.
