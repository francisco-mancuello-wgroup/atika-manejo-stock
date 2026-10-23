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
- [x] T2 — Catalog: queries return the focal point; photo components use it as `object-position`.
- [x] T3 — ERP: focal point picker in the product form, previews, saved by `updateProduct`, tests.
- [ ] T4 — Data + catalog: per-photo zoom `fit` (0 = whole photo, 100 = fill the frame; null = auto: landscape photos whole, others fill), applied by one shared framed-photo renderer in every cropped catalog view. User 2026-10-23: photos "muy cortadas"; wants zoom handled in the ERP, keeping every frame the same size.
- [ ] T5 — ERP: zoom slider next to the focal point, live in the Celular/Escritorio previews, saved by `updateProduct`.

## Acceptance

- A photo saved with focus 50/20 renders with `object-position: 50% 20%` in the lookbook, carousel, cards and search.
- Saving a product without touching the picker keeps each photo's focal point.
- Zoom still shows the whole photo.

## Progress / evidence

- Branch `feat/photo-focal-point` from `feat/uniform-catalog-photos` (34684c0).

- T1 done. RED: `product-image-focus.db.test.ts` 2 failed | 1 passed (focusX/focusY unknown). GREEN: `pnpm --filter @atika/db test` 37 files / 250 passed (also fixed stale model list in schema.test.ts: CatalogVersion). Migration `20261023191157_product_image_focus` (ADD COLUMN focusX/focusY INTEGER NOT NULL DEFAULT 50 + CHECK 0-100); `migrate status` up to date locally. Commit: see git log (`feat(db): ProductImage focal point`).
- T2 done. RED: catalog suite 11 failed (focus.ts missing, no focusX/focusY in outputs, no object-position). GREEN: catalog non-DB 39 files / 281 passed; queries.db + orders.db 42 passed; typecheck 6/6; lint 2 known warnings. Flow: queries.ts selects focusX/focusY -> lib/focus.ts (`focusOf`, `objectPosition`) -> catalog-view (imageFocus, images[]), lookbook (photos[]), presentation (photos[]), search (photoFocus) -> piece-photos, photo-carousel, product-photo (rows/page/sheet), product-sheet thumbnails, lookbook search thumbs. Zoom dialogs unchanged. Commit: `feat(catalog): crop photos around their focal point`.
- T3 done. RED: focus.test.ts + focal-point-picker.test.tsx fail to import, product-form save test and save.test.ts focus test failed (2 failed). GREEN: erp components+lib/products 46 files / 327 passed; erp full 849 passed, only known actions-guard failure; typecheck 6/6; lint 2 known warnings. UX: `FocalPointPicker` per existing photo (click/arrow keys 5%, marker, Centrar, Celular 1:1 and Escritorio 5:6 previews), hidden `focus.<imageId>` = "X,Y"; `updateProduct` applies valid points to this product's remaining images in the same transaction, invalid/unknown ignored. Commit: `feat(erp): pick a focal point for each product photo`.

- Tablet frame (515476e): portrait 3:4 frame on `sm` portrait screens; measured 12 pages: phone 390x405, tablet 505x673, desktop 762x900. Photo shapes (177 in public/media/products): 50 ~3:4, 46 ~2:3, 33 ~square, 24 taller than 2:3, 24 landscape (landscape lose 36–50% width under cover).

## Next step

Deploy: run `prisma migrate deploy` on the VPS DB (migration 20261023191157_product_image_focus) before the new build.
