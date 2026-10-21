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
- Chain strategy: **stacked-to-main** (user, 2026-10-21: "tienes que ir mergeando a main"). Merged locally with `--no-ff` per slice; remote `origin` is empty and pushing needs separate approval.
- Slices: A = T1+T2 (`3c66640`..`e4356bb`, scaffold + pricing, ~520 lines: over budget because scaffold config and docs travel with it; no cohesive smaller split); B = T3 (`09455d9`, db, ~300 lines); C1 = T4 (`77622b1`, ui, 368 lines) merged as `75d7db0`; C2 = T5 (`57b60cf` + docs `35746a1`, app shells, ~383 lines) merged as `587db0c`. Parent spot check before merge: `turbo run build test typecheck --force` with DATABASE_URL unset → 13/13 successful, 0 cached; `pnpm lint` exit 0.
- One work-unit commit per task, Conventional Commits.

## Tasks

- [x] T1 — Monorepo scaffold: pnpm workspace, Turborepo pipeline (build, dev, test, typecheck), root `biome.json` (lint/format), `packages/config` (shared tsconfigs), `.gitignore`, `.nvmrc`, root README.
  - Accept: `pnpm install && pnpm lint && pnpm typecheck` passes.
  - Note: TypeScript pinned to 6.0.3 — `typescript@7.0.2` on npm ships no `main` (no JS compiler API), which Next.js build-time type checking requires.
- [x] T2 — `packages/pricing` (TDD): `shippingPerUnit`, `unitCostUsd`, `priceGs`, `roundGs`, `priceLot(params, models)`.
  - Accept: Vitest covers the formula with the Casa Icona example (TC 7.400, factor 2,5, IVA 10 %, shipping 2.265,12 / 57 u.), zero-unit guard, rounding edge cases.
- [x] T3 — `packages/db`: Prisma schema (`suppliers`, `lots` with pricing params, `products`, `product_variants` (size + stock), `sales`, `product_images`, `catalog_settings`, `users` (email, password_hash), `sessions` (token_hash, user_id, expires_at)), first migration, typed client.
  - Accept: initial migration generated offline with `prisma migrate diff --from-empty` (no DB needed); `prisma generate` runs as a Turbo task before build/typecheck; schema test validates relations; provisioning Neon is done with user approval.
- [x] T4 — `packages/ui`: Tailwind v4 theme with atika tokens + fonts, shadcn init, Button/Input/Toggle primitives.
  - Accept: both apps import the theme and build.
- [x] T5 — `apps/erp` and `apps/catalog` shells: Next.js 16 apps wired to `pricing`, `db`, `ui`; ERP layout with sidebar, catalog layout with topbar.
  - Accept: `pnpm turbo run build` builds both apps; a smoke test renders each root page.

## Progress

- 2026-10-21: Feature document created. No task started.
- 2026-10-21: Auth changed from Better Auth to own `users`/`sessions` tables (user request: simple, managed with our tables). Tables added to T3; flow stays in `erp-auth` feature.
- 2026-10-21: ORM changed from Drizzle to Prisma (user decision). Pin 7.10.1: npm `prisma@latest` currently points to 8.0.0-rc.24 while `@prisma/client@latest` is 7.10.1.

## Verification evidence

- T1 (2026-10-21): `pnpm install` → done (pnpm 11.22.0); `pnpm lint` → "Checked 10 files. No fixes applied." exit 0; `pnpm typecheck` → exit 0, 0 tasks (no TS packages yet — real coverage starts in T2). TDD: not applicable (config only, no behavior). Commit `3c66640`. RDD: off (global) → no review.
- T2 (2026-10-21, commit `e4356bb`): RED observed — `pnpm --filter @atika/pricing test` → 15 failed (stub index). GREEN — 15 passed; `pnpm test` (turbo) 1/1 successful; `pnpm typecheck` 1/1 successful; `pnpm lint` exit 0. REFACTOR: none needed. Shipping is prorated over units bought (sum of model units), not current stock.
- T3 (2026-10-21, commit `09455d9`): RED observed — `pnpm --filter @atika/db test` → fails, `Cannot find module './generated/prisma/client'`. GREEN — `prisma validate` valid; `prisma generate` ok; 6/6 tests passed. From clean (generated dir removed): `pnpm test` 3/3 turbo tasks, `pnpm typecheck` 3/3, `pnpm lint` exit 0. Migration `20261021000000_init` has 9 `CREATE TABLE`. Prisma install scripts approved via pnpm `allowBuilds`; `pnpm-workspace.yaml` excluded from Biome (pnpm rewrites it). Not applied to any database: Neon pending user approval. Decisions: money in USD/rates as `Decimal`, guaraníes as `Int`; `Product.priceGs` persisted and recalculated on lot save; `CatalogSettings` single row id=1; sessions store SHA-256 of the cookie token.
- T4 (2026-10-21, commit `77622b1`): RED observed — `pnpm --filter @atika/ui test` → 4 test files failed, `Failed to resolve import "./cn"` (and button, input, switch). GREEN — 16/16 tests passed (cn merge, Button variants/disabled, Input, Switch role/aria-checked/click/Space/Enter/disabled); `tsc --noEmit` ok. Biome `css.parser.tailwindDirectives` enabled in `biome.json` (no files excluded). Theme in `src/styles/globals.css` (`@theme` tokens, `@source "../"`); fonts via `--font-inter`/`--font-fraunces` set by `next/font` in each app and mapped to `--font-sans`/`--font-display`. Pins: tailwindcss 4.3.3, clsx 2.1.1, tailwind-merge 3.7.0, cva 0.7.1, Testing Library react 16.3.3, jsdom 30.1.3.
- T5 (2026-10-21, commit `57b60cf`): RED observed — `pnpm --filter @atika/erp --filter @atika/catalog test` → 4 files failed, `Failed to resolve import "./sidebar"` / `"./page"` / `"./topbar"`. GREEN — 4 + 4 tests passed. From the repo root: `pnpm install` ok, `pnpm lint` exit 0 (54 files), `pnpm typecheck` 6/6 (`next typegen && tsc --noEmit` in apps), `pnpm test` 6/6, `pnpm build` 3/3 with DATABASE_URL unset (Next.js 16.4.2 Turbopack, both apps prerender `/`). Built CSS contains `--color-wa` and `.bg-wa`, so Tailwind scans `@atika/ui`. Pins: next 16.4.2, react/react-dom 19.3.1, @tailwindcss/postcss 4.3.3. No new pnpm build-script approvals were needed. Ports: catalog 3000, erp 3001. The catalog WhatsApp link points to `https://wa.me/` until the number becomes a catalog setting.

## Next step

Feature complete on `main`; push `main` to origin (authorized after completion). Next: provision Neon and apply `20261021000000_init` (needs user approval), then next feature (`erp-auth` or `erp-lots-inventory`).
