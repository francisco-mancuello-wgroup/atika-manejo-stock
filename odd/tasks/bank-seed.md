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

- [ ] T1 — Logo collection (download + normalize + manifest) and the seed step + `db:banks` command with tests.

## Progress

- 2026-10-22: Document created.

## Next step

T1.
