# Feature: variant-barcodes

## Objective

Every product size (`ProductVariant`) has its own internal barcode, the ERP prints labels for it as a PDF, and a scanned code finds the size in the inventory.

## Problem / why

The owner wants to label garments with their own barcodes (no supplier EAN reuse, no GS1 membership) to prepare for a Zebra label printer they do not own yet. User decisions 2026-10-22:
- Own codes, not supplier codes.
- One code per size (`ProductVariant`), because stock and sales are per size.
- Proceed now without the printer; direct ZPL printing waits until the printer (model and label size) is known.

## Scope

- Data: `ProductVariant.barcode` unique, generated on variant creation (ERP create/edit, Excel import, seeds), backfilled for existing variants by the migration.
- Format: opaque sequential code, Code 128 symbology, e.g. `AT000123`. It encodes no size, lot or price, so a printed label never goes stale.
- Labels: from the ERP product detail, choose sizes and copies (default = stock) and download a PDF with one 50×25 mm label per page (name, size, price, barcode + human-readable code).
- Scan: the inventory search matches an exact barcode (USB scanners type the code and press Enter).
- Out of scope: ZPL / Zebra Browser Print output (later, when the printer arrives); scanning in the sales flow; EAN-13/GS1.

## Constraints

- Barcodes are never reused or changed once assigned.
- UI copy Spanish (voseo); code/comments English.
- Label size is one parameter so the real label stock can be adopted later.

## TDD

- Strict (session config), Vitest: `pnpm --filter <pkg> test` / `pnpm exec vitest run <files>`; DB tests use `withRollback`. Observe RED before GREEN.

## Tasks

- [x] T1 — Data + generation: `barcode` column (unique, migration with backfill and a sequence), DB-default generator (no domain function needed), every variant creation path assigns one, tests.
- [x] T2 — ERP labels: barcode shown per size in the product detail, label PDF (50×25 mm, Code 128) with size/copies selection, tests.
- [x] T3 — Scan: inventory search matches an exact barcode and shows that product, tests.

## Acceptance criteria

- All existing and new variants have a distinct barcode; creating variants by any path assigns one.
- The product detail lists each size's code and downloads a printable PDF whose barcodes scan back to the same code.
- Typing/scanning a code in the inventory search shows its product.
- lint, typecheck, all package tests and the ERP build pass.

## Delivery

- Strategy: ask-on-risk. Forecast ~450 authored lines. RDD: off (global).

## Progress

- 2026-10-22: Document created (branch feat/variant-barcodes from main 778e8fc).
- 2026-10-22: T1 done. Codes come from a Postgres sequence via column default (`AT` + 6 digits), so every creation path (ERP save, seeds, factories) gets one with no code change.

- 2026-10-22: T2 done. Libraries bwip-js 4.11.4 (Code 128 bar widths) and @cantoo/pdf-lib 2.11.1 (maintained pdf-lib fork; vector bars). Route handler GET /inventario/[id]/etiquetas?copies-<size>=n; label size in LABEL_SIZE_MM.

- 2026-10-22: T3 done. getInventory ORs an exact case-insensitive barcode match (query already trimmed by the filters parser); the search is a GET form with a submit button, so a scanner's Enter submits.

## Verification evidence

- T2 RED: `pnpm exec vitest run src/lib/labels src/components/label-printer.test.tsx` (apps/erp): 3 files failed (modules not found).
- T2 GREEN: same command: 3 files, 18 tests passed; `pnpm --filter @atika/erp test`: 752 passed; `pnpm --filter @atika/erp build`: ok, route /inventario/[id]/etiquetas listed. Commit 1f950bd.

- T1 RED: `pnpm exec vitest run src/schema.test.ts src/barcode.db.test.ts` (packages/db): 5 failed (no barcode field/column).
- T1 GREEN: same files then full `pnpm exec vitest run`: 33 files, 223 tests passed; `pnpm typecheck`: 6/6 successful; `prisma migrate diff` vs schema: empty (no drift). Migration 20261022080000_variant_barcode applied to local DB (193 variants backfilled). Commit ae73b4f.

- T3 RED: `pnpm exec vitest run src/lib/queries/queries.db.test.ts` (apps/erp): 1 failed (expected product, got []). GREEN: full ERP suite 105 files / 754 tests passed. Commit 1639197.

- Risk assessment (`gentle-ai review assess`, base 778e8fc, committed only): high; RDD off, so an independent read-only verifier ran: no confirmed defects. Migration applied to a throwaway Postgres 16 with 50 legacy variants: backfill AT000001–AT000050, next insert AT000051, no drift. Note: backfill order between environments is not strictly guaranteed (codes unique; not a requirement).
- Pending: no physical scan of a printed label yet; route handler and `getProductLabelData` have no direct test.

## Next step

User: print a test label and scan it; then merge/push decision.
