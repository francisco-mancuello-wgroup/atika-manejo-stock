# Feature: bank-seed

## Objective

Seed the Paraguayan banks shown in the bank-promos reference (Nissei) with their logos, so the owner starts with a ready bank list in Promos → Bancos.

## Scope

- Banks: Itaú, Continental, ueno, BNF, Sudameris, Visión, Basa, Familiar, GNB, Atlas, Interfisa, Bancop, Solar, FIC, Medalla Milagrosa, Paraguayo Japonesa (display names as each brand writes them).
- Logos downloaded from each bank's official website (prefer an SVG/PNG brand logo; else apple-touch-icon/high-res favicon), normalized to WebP (max side 400px, transparent or white background kept, quality like product photos), committed under `data/bank-logos/<slug>.webp` with `data/bank-logos/manifest.json` (name, slug, file, source URL, fetched date). Missing/unusable logo -> bank seeded without logo and reported.
- `pnpm db:banks` (root + packages/db script, like `db:user`): upserts banks by name (case-insensitive, matching the unique rule), sets `logoUrl` to `/media/banks/seed/<slug>.webp`, copies the files into `apps/erp/public/media/banks/seed/` and `apps/catalog/public/media/banks/seed/` (gitignored like other media). Never deletes banks, never touches promos, never overwrites a logo the owner uploaded (`/media/banks/uploads/...`).
- `pnpm db:seed` runs the same bank step after its reload (idempotent).
- README section in packages/db/seed/README.md.

## TDD

- Strict, Vitest (`pnpm --filter @atika/db test`); DB tests roll back.

## Tasks

- [x] T1 — Logo collection (7 of 16 logos; rest `file: null`, owner uploads them from the ERP) and the seed step + `db:banks` command with tests. Commit: COMMIT

## Progress

- 2026-10-22: Document created.
- 2026-10-22: T1 done.

## Verification evidence

- RED: `pnpm test seed/banks` failed (module `./seed-banks` / `./normalize-logo` not found) before implementation.
- GREEN: seed-banks + normalize-logo tests pass (DB tests with rollback).
- Scope change (user): logo collection stopped; fetch script dropped. Logos: Itaú, Sudameris, Basa, Familiar, GNB, Interfisa, Solar. Missing: Continental, ueno, BNF, Visión, Atlas (white-only logo), Bancop, FIC, Medalla Milagrosa and Paraguayo Japonesa (white-only logos).
- `pnpm db:banks`: 16 created, 7 logos copied.

## Next step

None; owner uploads missing logos from the ERP.
