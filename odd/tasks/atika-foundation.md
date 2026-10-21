# Feature: atika-foundation

## Objective

Bootstrap the atika monorepo so both apps (ERP admin and public catalog) can be built on a shared, tested core: pricing rules, database schema, and design tokens.

## Problem

Stock lives in 4 Excel workbooks (Casa Icona, Milonga, Zunilda Gutiérrez, Átika) with inconsistent pricing multipliers, mixed exchange rates, sales marked by strikethrough without decrementing stock, and no way to publish a catalog for customers.

## Why

Two apps read the same data and the same price formula. If the formula or schema is duplicated, ERP and catalog prices drift apart. The foundation centralizes both before any screen is built.

## Scope (this feature)

- pnpm workspace + Turborepo monorepo.
- `apps/erp` and `apps/catalog` as Next.js App Router apps (empty shells that build and render).
- `packages/pricing`: pure, framework-free price calculation.
- `packages/db`: Prisma schema + migrations for Postgres, generated client exported to both apps.
- `packages/ui`: Tailwind v4 theme tokens taken from `atika.pen` (bg, surface, line, ink, muted, subtle, accent, warn, warnbg, ok, wa; Inter + Fraunces).
- `packages/config`: shared tsconfig and Biome config.

## Out of scope (next features)

- `erp-lots-inventory`: lots, parameters panel ("Guardar y recalcular"), model × size grid.
- `erp-sales`: register sale, decrement stock, sales list, dashboard KPIs.
- `erp-catalog-settings`: visibility, photos (blob storage), WhatsApp number/template, switches.
- `catalog-web`: public home + product page + prefilled WhatsApp link.
- `excel-import`: one-off import of the 4 workbooks (fixing known data bugs).
- `erp-auth`: login form, scrypt verify, session create/revoke, `proxy.ts` redirect for unauthenticated requests plus server-side session check in ERP layout and every Server Action, seed script for the admin user. No third-party auth library.

## Stack

| Concern     | Choice                                                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime     | Node 24 LTS                                                                                                                             |
| Monorepo    | pnpm 11 workspaces + Turborepo 2                                                                                                        |
| Apps        | Next.js 16 (App Router, Server Actions), React, TypeScript                                                                              |
| Styling     | Tailwind CSS 4 + shadcn/ui                                                                                                              |
| Database    | Postgres (Neon, via Vercel Marketplace) + Prisma 7.10.1 (`@prisma/adapter-neon`)                                                        |
| Validation  | Zod 4                                                                                                                                   |
| Images      | Vercel Blob (catalog feature)                                                                                                           |
| Auth (ERP)  | Own tables (`users`, `sessions`), password hashed with Node `crypto.scrypt`, opaque session token in httpOnly cookie (ERP auth feature) |
| Tests       | Vitest (unit), Playwright (e2e, later features)                                                                                         |
| Lint/format | Biome                                                                                                                                   |
| Hosting     | Vercel, one project per app from the same repo                                                                                          |

## Constraints

- UI copy in Spanish (es-PY); code, identifiers, comments and docs in English.
- Currency: prices shown in Guaraníes, IVA included; costs entered in USD.
- Pricing parameters are per lot and editable; changing them and saving recalculates every model in the lot and the catalog reflects it.
- Price formula (single source of truth in `packages/pricing`):
  - shipping per unit = total shipping USD ÷ units in lot
  - unit cost USD = original value × cost % + shipping per unit
  - price Gs = unit cost × sale factor × (1 + IVA) × exchange rate, rounded to ₲ 1.000
- All struck/"retiro" rows in the workbooks are sales.
- TypeScript version must be one supported by Next.js 16 (verify before pinning; npm latest is 7.x).

## TDD

- Mode: strict (source: session configuration "Strict TDD Mode: enabled").
- Runner: Vitest (`pnpm test` → `turbo run test`). RED before GREEN, then REFACTOR.

## Delivery

- Strategy: ask-on-risk (default). Forecast ~600 authored lines (generated scaffolding and lockfiles excluded) → will ask for chain strategy before exceeding ~400.
- Branch: `feat/atika-foundation` (repo is on `main`).
- One work-unit commit per task, Conventional Commits.

## Tasks

- [x] T1 — Monorepo scaffold: pnpm workspace, Turborepo pipeline (build, dev, test, typecheck), root `biome.json` (lint/format), `packages/config` (shared tsconfigs), `.gitignore`, `.nvmrc`, root README.
  - Accept: `pnpm install && pnpm lint && pnpm typecheck` passes.
  - Note: TypeScript pinned to 6.0.3 — `typescript@7.0.2` on npm ships no `main` (no JS compiler API), which Next.js build-time type checking requires.
- [x] T2 — `packages/pricing` (TDD): `shippingPerUnit`, `unitCostUsd`, `priceGs`, `roundGs`, `priceLot(params, models)`.
  - Accept: Vitest covers the formula with the Casa Icona example (TC 7.400, factor 2,5, IVA 10 %, shipping 2.265,12 / 57 u.), zero-unit guard, rounding edge cases.
- [x] T3 — `packages/db`: Prisma schema (`suppliers`, `lots` with pricing params, `products`, `product_variants` (size + stock), `sales`, `product_images`, `catalog_settings`, `users` (email, password_hash), `sessions` (token_hash, user_id, expires_at)), first migration, typed client.
  - Accept: initial migration generated offline with `prisma migrate diff --from-empty` (no DB needed); `prisma generate` runs as a Turbo task before build/typecheck; schema test validates relations; provisioning Neon is done with user approval.
- [ ] T4 — `packages/ui`: Tailwind v4 theme with atika tokens + fonts, shadcn init, Button/Input/Toggle primitives.
  - Accept: both apps import the theme and build.
- [ ] T5 — `apps/erp` and `apps/catalog` shells: Next.js 16 apps wired to `pricing`, `db`, `ui`; ERP layout with sidebar, catalog layout with topbar.
  - Accept: `pnpm turbo run build` builds both apps; a smoke test renders each root page.

## Progress

- 2026-10-21: Feature document created. No task started.
- 2026-10-21: Auth changed from Better Auth to own `users`/`sessions` tables (user request: simple, managed with our tables). Tables added to T3; flow stays in `erp-auth` feature.
- 2026-10-21: ORM changed from Drizzle to Prisma (user decision). Pin 7.10.1: npm `prisma@latest` currently points to 8.0.0-rc.24 while `@prisma/client@latest` is 7.10.1.

## Verification evidence

- T1 (2026-10-21): `pnpm install` → done (pnpm 11.22.0); `pnpm lint` → "Checked 10 files. No fixes applied." exit 0; `pnpm typecheck` → exit 0, 0 tasks (no TS packages yet — real coverage starts in T2). TDD: not applicable (config only, no behavior). Commit `3c66640`. RDD: off (global) → no review.
- T2 (2026-10-21, commit `e4356bb`): RED observed — `pnpm --filter @atika/pricing test` → 15 failed (stub index). GREEN — 15 passed; `pnpm test` (turbo) 1/1 successful; `pnpm typecheck` 1/1 successful; `pnpm lint` exit 0. REFACTOR: none needed. Shipping is prorated over units bought (sum of model units), not current stock.
- T3 (2026-10-21): RED observed — `pnpm --filter @atika/db test` → fails, `Cannot find module './generated/prisma/client'`. GREEN — `prisma validate` valid; `prisma generate` ok; 6/6 tests passed. From clean (generated dir removed): `pnpm test` 3/3 turbo tasks, `pnpm typecheck` 3/3, `pnpm lint` exit 0. Migration `20261021000000_init` has 9 `CREATE TABLE`. Prisma install scripts approved via pnpm `allowBuilds`; `pnpm-workspace.yaml` excluded from Biome (pnpm rewrites it). Not applied to any database: Neon pending user approval. Decisions: money in USD/rates as `Decimal`, guaraníes as `Int`; `Product.priceGs` persisted and recalculated on lot save; `CatalogSettings` single row id=1; sessions store SHA-256 of the cookie token.

## Next step

Delivery budget reached (~400+ authored lines): ask chain strategy (ask-on-risk) before T4.
