# Feature: photo-focal-point

## Objective

Every catalog photo fills its frame (same size on every page), and the ERP lets the owner choose, per photo, which point must stay visible when the frame crops it.

## Problem / why

User request 2026-10-23: lookbook photos now fill a fixed-height frame with `object-cover` (branch `feat/uniform-catalog-photos`, 7d72b15 + 34684c0), so some photos are cut badly. The frame shape differs per screen (phone ~390×405, tablet 768×492, desktop 762×900), so a one-time crop cannot fit every screen. User chose option B: a focal point per photo, set in the ERP.

## Scope

- Data: `ProductImage.focusX` / `focusY`, integer percent 0–100, default 50 (center). Existing rows get 50/50.
- ERP product form ("Fotos"): click (or keyboard) on a photo to place the focal point, a visible marker, and small previews of how it crops in a phone (≈1:1) and desktop (≈5:6) frame. Saved with the existing product save; new uploads start at 50/50.
- Catalog: every place that renders product photos with `object-cover` applies `object-position: X% Y%` (lookbook piece photos, product page carousel, product cards, search thumbnails). Zoom dialogs stay uncropped.

## Constraints

- UI copy Spanish (voseo), code/comments English.
- No change to how photos are uploaded or stored (MEDIA_DIR / Blob unchanged).
- Prisma migration additive only (`ALTER TABLE ... ADD COLUMN ... DEFAULT 50`).

## TDD

- Strict (session config), Vitest: `pnpm --filter <pkg> exec vitest run <files>`; DB tests use `withRollback` against the local Docker DB (`localhost:5436`). Observe RED before GREEN.

## Tasks

- [x] T1 — Data: `focusX`/`focusY` on `ProductImage` (default 50, 0–100), migration, schema test.
- [ ] T2 — Catalog: queries return the focal point; photo components use it as `object-position`.
- [ ] T3 — ERP: focal point picker in the product form, previews, saved by `updateProduct`, tests.

## Acceptance

- A photo saved with focus 50/20 renders with `object-position: 50% 20%` in the lookbook, carousel, cards and search.
- Saving a product without touching the picker keeps each photo's focal point.
- Zoom still shows the whole photo.

## Progress / evidence

- Branch `feat/photo-focal-point` from `feat/uniform-catalog-photos` (34684c0).

- T1 done. RED: `product-image-focus.db.test.ts` 2 failed | 1 passed (focusX/focusY unknown). GREEN: `pnpm --filter @atika/db test` 37 files / 250 passed (also fixed stale model list in schema.test.ts: CatalogVersion). Migration `20261023191157_product_image_focus` (ADD COLUMN focusX/focusY INTEGER NOT NULL DEFAULT 50 + CHECK 0-100); `migrate status` up to date locally. Commit: see git log (`feat(db): ProductImage focal point`).

## Next step

T2.
