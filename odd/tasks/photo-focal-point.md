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
- [x] T4 — Data + catalog: per-photo zoom `fit` (0 = whole photo, 100 = fill the frame; null = auto: landscape photos whole, others fill), applied by one shared framed-photo renderer in every cropped catalog view. User 2026-10-23: photos "muy cortadas"; wants zoom handled in the ERP, keeping every frame the same size.
- [x] T5 — ERP: zoom slider next to the focal point, live in the Celular/Escritorio previews, saved by `updateProduct`.

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

- T4 done. RED: db fit tests 3 failed (`fit` unknown), ui `frame-layout.test.ts` no module, catalog `framed-photo.test.tsx` no module, focus.test 3 + queries.db 1 failed. GREEN: db 37 files / 254 passed; ui frame-layout 8 passed; catalog 42 files / 331 passed; typecheck 6/6. Migration `20261023194500_product_image_fit` (ADD COLUMN fit INTEGER NULL + CHECK fit IS NULL OR 0-100). `frameLayout`/`autoFit` live in `packages/ui/src/lib/frame-layout.ts` (exported from `@atika/ui`): s = sContain + fit/100*(sCover-sContain); axis bigger than the frame is offset by the focus (never a gap), smaller is centered. Auto (fit null): landscape (w>h) -> 0, else 100, resolved on the client after `onLoad`. `FramedPhoto` (catalog `components/framed-photo.tsx`, ResizeObserver + natural size, falls back to object-cover + object-position before measuring) used by piece-photos, photo-carousel, ProductPhoto (rows/page/sheet), product-sheet thumbnails, lookbook search thumbnails. Commit: `feat(catalog): per-photo zoom inside the fixed frame`.

- T5 done. RED: 10 failed (picker zoom x6, product-form zoom save, `parseFitFields` x2, save.test zoom). GREEN: erp components+lib/products 46 files / 338 passed. UX: per photo "Zoom" range (step 5, labelled "Zoom de la foto N", ends Completa/Llenar, value as %), "Automático" checkbox (null) and helper "Bajá el zoom para ver la foto completa en la web."; Celular/Escritorio previews use `frameLayout` from `@atika/ui` in percent of the frame. Hidden `fit.<imageId>` = integer 0-100 or empty (auto); `updateProduct` saves it with the focus in the same transaction, only this product's remaining photos, invalid ignored, missing keeps the stored value; `getProductForEdit` loads `fit`. Commit: `feat(erp): zoom slider for each product photo`.

- Height-first (2026-10-23, user: "me interesa más no perder el alto que el ancho"): `autoFit(imageW, imageH, frameW, frameH)` now keeps the whole height (narrower photo → whole with side bands, wider → fills, only sides cropped); 3:4 frame on phones too, `h-[min(60svh,133vw)]`, centered; phone panel spacing tightened; ERP Celular preview 3:4. RED: ui 2, catalog 4, erp 1 failed; GREEN: ui 48, catalog components 126, erp components+products 338. Browser: 12 pages identical per viewport — 390x844 → 380x506, 820x1085 → 488x651, 1440x900 → 762x900; Zamba Pitaya shown full height. On a 844px phone, pages with a colour selector need a small scroll of the info panel to reach the button.

## Next step

Deploy: run `prisma migrate deploy` on the VPS DB (migration 20261023191157_product_image_focus) before the new build, then `20261023194500_product_image_fit`.
