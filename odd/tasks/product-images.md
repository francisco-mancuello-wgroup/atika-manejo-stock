# Feature: product-images

## Objective

Use the product photos embedded in the inventory workbooks: export them once into a versioned `data/` folder, load them with the seed, and show them in the ERP and the public catalog.

## Problem

The workbooks embed 111 images as floating drawings anchored to product rows (Átika 28, Casa Icona 18, Milonga 48 for 60 products, Zunilda 17). Products have no images in the database and the catalog shows placeholders.

## Scope

- Export command `pnpm db:export-images`: reads workbooks from `ATIKA_EXCEL_DIR`, maps each drawing anchor (row) to the product parsed from that row, optimizes (WebP, max 1600px long side, quality ~82) and writes `data/product-images/<lot-slug>/<file>.webp` plus `data/product-images/manifest.json` (lot, product key used by the seed, file, original size). Re-runnable; deterministic file names.
- `data/product-images/` is committed (repo is private; user request).
- Seed: reads the manifest, creates `ProductImage` rows (position 0 = cover) and copies files to each app's `public/media/products/` (gitignored); missing manifest → seed still works without images.
- UI: catalog grid cards and product page show the cover (keep the sand offset block of the design); ERP Catálogo web and Inventario show a small thumbnail; fallback placeholder when a product has no image.

## Out of scope

- Uploading/replacing photos from the ERP; cloud storage.

## Constraints

- Product matching must be exact and reported: list products without image and images without product (never guess).
- Images only; no other workbook data written to `data/`.
- Re-running export + seed is safe (user: "no hay problema en volver a ejecutar").

## TDD

- Mode: strict. Runner: Vitest. Anchor→row mapping, manifest building and file naming tested with in-memory fixtures first.

## Delivery

- Stacked-to-main. Branch `feat/product-images`. Commits: export, seed, UI, docs.

## Tasks

- [x] T1 — Export command + manifest + optimized images in `data/product-images/`.
- [x] T2 — Seed loads images (ProductImage rows + copy to apps' public dirs).
- [x] T3 — Catalog and ERP show images with placeholder fallback.

## Progress

- 2026-10-21: Document created.
- 2026-10-21: T1-T3 implemented by one writer. Commits: 27de167 (export code + tests), bd43943 (data/product-images, 113 files, 3.1 MB), dbfa1fe (seed), 1f2b9c6 (catalog + ERP UI).
- Matching rule: a drawing belongs to the product read from the worksheet row of its top-left anchor; a product owns all its size rows (Casa Icona layout). Product key = lot name + position in the lot (as the seed creates them), plus name and code checked at seed time.
- Image counts differ from the document header: Milonga has 49 drawings (not 48), total 112 (not 111).
- Seed refactor: per-lot import moved to `packages/db/seed/reload.ts` (`importLot`, `clearImported`) so it can be tested in a rolled-back transaction.

## Verification evidence

TDD (strict, Vitest 5):
- RED: `parse.test.ts` "records the worksheet rows each product was read from" failed (`[undefined, undefined]` vs `[[3,4],[5]]`) -> GREEN after adding `sourceRows`.
- RED: `seed/images/*.test.ts` (slug, match, anchors, optimize, manifest, export) failed with "Cannot find module" before the modules existed -> GREEN (59 passing in seed).
- Seed side (`seed-images.test.ts`, `reload.db.test.ts`): tests and implementation were written in the same step, so no separate RED was observed.
- RED: catalog (`catalog-view`, `product-card`, product page, `queries.db`) 6 failures and ERP (`view-models`, `inventario-view`, `catalogo-web-view`, `product-thumb`) 3 failures + 1 missing module, all before implementation -> GREEN.

Commands (repo root):
- `pnpm db:export-images` twice: identical sha256 over all files (574530ab...10c7) and no git diff against the committed folder.
- `pnpm lint`: 212 files, no errors. `pnpm typecheck`: 6/6 tasks successful.
- `pnpm test`: ui 34, pricing 15, db 76 (includes DB test), catalog 52, erp 153 passing.
- `env -u DATABASE_URL pnpm build`: 3/3 tasks successful.
- `pnpm db:seed` twice: both "112 product images linked and copied". SQL: 112 product_images rows.
- Catalog `next start -p 3100` with one product temporarily published: `/` 200, HTML contains `/_next/image?url=%2Fmedia%2Fproducts%2F...webp`; `/media/products/zunilda-gutierrez/zg899-pueblo-shirt.webp` 200 `image/webp`. Server stopped; the product was unpublished again.

Per lot (matched images / products / products without image / unmatched images):
- Casa Icona: 18 / 18 / 0 / 0
- Milonga: 49 / 60 / 11 / 0. Without image: SALIDA S A (x2), T BSC M A (x2), Falda A, Bot Amar A (x5), TOP AMA A.
- Zunilda Gutierrez: 17 images (16 products) / 17 / 1 / 0. Without image: ANCESTRAL MIDI DRESS (row 13). OHAL CROP TOP (row 12) has two drawings anchored on the same row (files `zg962-ohal-crop-top-3/-4`); one probably belongs to row 13 but it is not guessed. Needs manual review.
- Átika: 28 / 28 / 0 / 0

Sizes: sources 14.2 MB -> data/product-images 3.1 MB (112 webp + manifest). Casa Icona sources are ~5 KB thumbnails (about 60-130 px), so those photos are low resolution.

Seed side effects: re-seeding recreates products, so publication state and categories were reset (0 published afterwards). AppSettings and CatalogSettings rows are kept.

## Next step

Review the two Zunilda anchors (OHAL CROP TOP / ANCESTRAL MIDI DRESS) and the 11 Milonga products without photo; decide whether to merge `feat/product-images`.
