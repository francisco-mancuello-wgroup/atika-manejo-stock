# Pink from the event workbook

Objective: the Pink page shows exactly the event workbook, with its own prices. Branch `feat/pink-excel`; delivery `ask-on-risk`; test runner Vitest (`pnpm --filter <app> exec vitest run`).

## Specs

- **S1** Pink is exactly the workbook "STOCK EVENTO PINK (1).xlsx": "si reemplazamos lo que ahora tiene pink por este nuevo excel lo que tiene este excel es lo que tiene pink el evento pink". Done in production data (group "Evento Pink": 30 sizes, 31 units).
- **S2** Products that hold units in the active group but sit in no catalog (`catalog = null`) show on `/catalogos/pink`, and only there: "por ahora solo van todos a pink". Today: ATLC02, ATLC06, PALC05 (Milonga), Lia Dress (Baobab), Ginger Maxi L (Zunilda Gutierrez).
- **S3** A size in the group can carry its own Pink price: "y si tiene precio ese es el precio en pink". It applies on the Pink page (display, cart, WhatsApp message); brand catalogs keep the ERP price. Nullable column on `GroupAllocation`.
- **S4** Load the workbook prices into production: Lia Dress S ₲ 1.553.000, Ginger Maxi L ₲ 2.328.000.

## Tasks

- [x] T1 (S3) migration + schema: `GroupAllocation.priceGs Int?` — route: inline — 60edaf6; applied in prod alone (db execute + migrate resolve)
- [x] T2 (S2, S3) store: catalog-less group pieces on Pink only; Pink price on Pink page, cart and message — route: inline
- [ ] T3 (S4) apply migration in production, deploy, load the two prices, verify Pink — route: inline

## Log

- L1 (2026-10-22) "pnpm db:group "C:\Users\fmancuello\Downloads\STOCK EVENTO PINK (1).xlsx" en prod" → "si reemplazamos lo que ahora tiene pink por este nuevo excel lo que tiene este excel es lo que tiene pink el evento pink" → "por ahora solo van todos a pink" → "y si tiene precio ese es el precio en pink" → "si dale avanzá con 1 a 3".
- L2 S1 applied in production by one transaction: removed 27 old allocations (none sold), loaded 30; skipped stock-0 rows (Costa Black XS, ATL701 M, LUN701 M, MISC01 S, MISC02 S) and MAUC06 "U" (ERP only has M); PALC04 S/M mapped to "XS/S"/"M/L". Variant stock unchanged (217).
- L3 Still open, outside this feature: store names for ATLC06, PALC05, ETNC01; ATLC06 has no photo.
- L4 Fabián's `variant_barcode` migration applied in prod with the user's OK ("si dale aplicala"): 193 sizes, AT000001..AT000193, stock 217 unchanged. `drop_product_in_pink` left pending on purpose ("dejalo asi").
- L5 T2 evidence: lookbook unit RED (3 failing) → GREEN; DB tests could not go RED for the logic because prod lacked the columns, GREEN after both migrations. Store 279/279, ERP 757/757. packages/db: 4 pre-existing Windows failures (path separators, EBUSY temp files), unrelated.
- L6 Assumptions: one event price per product (first priced size); the event price replaces catalog discounts on Pink; cart lines key on product+size, so the same size added from a brand catalog and from Pink merges into one line.
