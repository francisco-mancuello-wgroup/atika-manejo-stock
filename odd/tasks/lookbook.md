# Feature: lookbook

Objective: replace the public catalog UI (`apps/catalog`) with the Atika lookbook built in `lizboutique-main` (francisco-mancuello-wgroup/atika), on Fabian's data model; deploy on the Vercel project `atika` (atika-event.vercel.app) with the Supabase project `atika-erp`.
Branch: `feat/lookbook` (repo copy `francisco-mancuello-wgroup/atika-manejo-stock`; origin = JWFSA). Delivery: PR to JWFSA. Test runner: Vitest (`pnpm test`).

## Specs

- S1 — Run locally on Supabase. "vamos a usar el proyecto de fabian y vamos a tirar nuestra ui"; "dale usemos ese entonces levantemos todo en local y aplicamos nuestra ui que hicimos"; "usamos supabase para la base de datos"; "vercel usamos el que teneniamos atika-event". Done: Supabase `atika-erp` (ref `feusjitsmaavtabxyegn`), migrations applied, seeded (123 products), catalog :3000 and ERP :3001 running.
- S2 — Three catalogs only, as the PDFs: Casa Icona (lot "Casa Icona", 18 looks), Milonga (lot "Milonga", pages of the editorial PDF; sets share a page), Sordo (brand "Sordo" inside lot "Átika", 8 pieces). Each piece belongs to one catalog with a PDF page order and a section. Other products are price/stock references only and are never shown.
- S3 — Owner-set sale price in US$: "si el precio en dolar lo debe colocar tambien parametrizado en el dasboard admin y tocan la duenha". When set, price Gs = sale price US$ × lot exchange rate (rounded like the lot formula); Sordo prices from monicasordo.com at 7400 Gs/US$ (Oriente 440, Cubagua earrings 380, Cubagua earcuff small 200 gold/silver, large 320; Puerto Asymmetric gold/silver and Cubagua Doble from the PDF Gs ÷ 7400).
- S4 — Lookbook UI (as built in lizboutique-main): home with the three covers, a "Ver todo" button, then Casa Icona → Milonga → Sordo one piece per screen with scroll snapping; name + price row, color + size chips, WhatsApp inquiry with size, color, price and page link; tap a photo for full screen with an X; sets on one page; pieces without stock disappear ("si no hay desaparece"); Atika tokens (#efecec, #252525, #2c332f, #3f5147), Trirong 300 + Quattrocento Sans, logo and Dawn icons. Works on tablet (vertical first), desktop and phone. WhatsApp number 0992442692.
- S5 — Supabase access for Fabian: "al supabase dale tambien acceso a fabian fvera@wgroup.com.py". Done by the user (Administrator invite).

## Tasks

- [x] T1 — S2, S3 — inline — Prisma: `Product.catalog` (enum), `catalogOrder`, `catalogSection`, `catalogName`, `salePriceUsd`; pricing and ERP repricing honour `salePriceUsd`; seed preserves them; migration `20261022000000_lookbook_catalogs` applied to `atika-erp`.
- [x] T2 — S2, S3 — delegated (parallel with T3) — ERP "Catálogo web": per-product catalog, page, section, lookbook name and sale price US$; saving a price reprices the lot; `090f85c`.
- [x] T3 — S2, S3 — delegated (parallel with T2) — `data/catalogs/lookbook.json` (65 placements) applied by the seed when no saved placement exists; Milonga PDF page photos as covers; Sordo US$ prices; seeded twice on `atika-erp` (18 / 39 / 8).
- [ ] T4 — S4 — catalog app: lookbook UI and Atika theme (catalog app only; the ERP keeps its theme).
- [ ] T5 — S1, S4 — deploy: Vercel `atika` → this repo, root `apps/catalog`; ERP needs a login before it is public (no auth today).

## Log

- L1 (2026-10-21) — "vamos a usar el proyecto de fabian y vamos a tirar nuestra ui, necesito que vercel vea esta orgnizacion https://github.com/JWFSA/atika-manejo-stock"; "o traemos en mi repo"; "dale usemos ese entonces levantemos todo en local y aplicamos nuestra ui que hicimos"; "usamos supabase para la base de datos"; "vercel usamos el que teneniamos atika-event".
- L2 (2026-10-21) — Vercel Hobby cannot deploy private org repos, so the repo was copied to the user's account (private). Supabase `atika-erp` created (a separate schema in `atika` was rejected: the transaction pooler does not honour `search_path` reliably). Prisma migrate needs the session pooler (5432); apps use the transaction pooler (6543). Seed needs exactly one workbook per brand; staged in `Documents/dev/atika-excel` (original Casa Icona file, not the valorized one).
- L3 (2026-10-21) — T1: RED observed (pricing override, ERP repricing), then GREEN; `pnpm typecheck` clean. `catalogName` added so lookbook names never change the workbook name the seed keys products by. Known environmental failures on Windows (not caused here): `seed/images/export.test.ts` and `seed/images-pdf/export-pdf.test.ts` (EBUSY unlinking sharp output), `seed/images/pdf-precedence.test.ts` (path separators), and DB tests timing out against the remote Supabase pooler (designed for the local docker Postgres).
- L4 (2026-10-21) — "levantemos primero luego vemos la ui"; "tambien subir en vercel"; "levantar la base dedatos del repo mismo a supabase". Production deploy of the current catalog UI: Vercel `atika` connected to the user's copy (Hobby cannot deploy private org repos), root `apps/catalog`, build `pnpm --filter @atika/db db:generate && pnpm run build`, `prebuild` copies `data/` photos into `public/media/products` (`30118bb`); https://atika-event.vercel.app serves the catalog and photos from `atika-erp`. The ERP is not deployed: it has no login.
- L5 (2026-10-21) — "este debemos trabajar https://github.com/JWFSA/atika-manejo-stock": the branch is pushed to JWFSA and reviewed there as a draft PR; the user's copy stays in sync for Vercel. Seed transaction now uses `maxWait: 30_000` (remote pooler). Milonga pieces without stock (ARTC07, ARTC08, ATL701, LUN701, RUS702) stay hidden.
- Next: T4 (lookbook UI on `apps/catalog`), then ERP login before deploying the ERP.

## Update 2026-10-21: fixed US$ price removed

Prices always use the lot formula. `Product.salePriceUsd`, the "Precio de venta US$" field, the "US$ fijo" display and the seed handling were removed (migration `20261022010000_drop_sale_price_usd`); the Átika lot was recalculated so the Sordo pieces take formula prices.
