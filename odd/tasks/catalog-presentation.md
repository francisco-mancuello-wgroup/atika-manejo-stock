# Feature: catalog-presentation

## Objective

Make the public catalog work like the reference presentation site: collections index, one full-screen swipeable piece per product, size selection and WhatsApp consultation. Spec: `odd/specs/catalog-presentation.md`.

## Problem

The user wants the catalog "igual" to atika-event.vercel.app/catalogos/casa-icona for showing pieces on a tablet.

## Scope

- Collections index at `/`, presentation pages at `/catalogos/[slug]`, rows list moved to `/ver-todo`.
- Data: collection slug from supplier name; colors derived from product color, else from the name's trailing color word for Casa Icona (NEGRO, BLANCO, VINO, …) — document the mapping; descriptions from product description or Casa Icona look descriptions (`data/catalog-categories/casa-icona-looks.json`).

## Out of scope

- Language switch (ES/EN), site announcement bar, global search page.

## Constraints

- Catalog-safe view models only; builds without `DATABASE_URL`; accessibility (dialog, radios, labels).

## TDD

- Strict, Vitest + Testing Library.

## Tasks

- [x] T1 — Data: collections (slug, name, cover, published count), presentation view model per collection (photos, color, description, sizes, price), tests. Commit 971c278.
- [x] T2 — Routes: `/` collections index, move rows list to `/ver-todo`, links updated. Commit 00185dc.
- [x] T3 — Presentation page: cover + product sections, layout per spec, carousel + zoom. Commit 459c935.
- [x] T4 — Size picker + WhatsApp button behavior and message. Commit e1ee485.

## Decisions

- Piece order: import order (`createdAt` asc, `id` asc), so a collection reads like the supplier sheets and look numbers; the rows list stays newest first. Collections are listed in order of first appearance (Casa Icona, Milonga, Zunilda Gutierrez, Átika).
- Collection = supplier; slug = accent-free kebab of the supplier name (`Átika` is `atika`). Cover of the index card and of the presentation = first photo of the first piece that has one.
- Colors: stored `color` text is shown (sentence case) with a swatch when a known color word is found anywhere in it; values containing digits (internal codes such as `NG U985001`) are dropped; with no stored color the trailing color word (or two words) of the name is used, shown only when known. Table (`apps/catalog/src/lib/colors.ts`): negro (black), blanco (white), marfil, crudo, perla, vino, azul, celeste, verde, verde lima (lima), fucsia, rosa, rojo, coral, cobre, amarillo, tostado, chocolate, coco, plata. Not colors, so no swatch and not derived: ESTAMPADO, RIO, SOLEIL, RAMBUTAN, PITAYA.
- Descriptions: product description, else for Casa Icona only the look description of `data/catalog-categories/casa-icona-looks.json`, matched by the same three tiers as the seed (normalized, color translation and generic words dropped, look words subset); ambiguous or no match gives none.
- Layout: route groups; `(site)` has the topbar (index, `/ver-todo`, `/producto/[id]`), `/catalogos/[slug]` has none (root layout only gives html/body). Presentation = fixed scroll container with `snap-y snap-mandatory`, `h-svh` sections, `landscape:lg:` split `1.15fr/1fr`, otherwise photo on top and info below (`max-h-[55svh]`). No `scroll-smooth` so deep links land exactly.
- `catalogHref` now points to `/ver-todo` (novedades) and `/ver-todo/<categoria>`; `next.config.ts` redirects the old `/<categoria>` URLs (temporary redirects). The topbar search posts to `/ver-todo[/categoria]`.
- WhatsApp: button is `aria-disabled` (not `disabled`) until a size is chosen so pressing it can focus the sizes; one available size is preselected. Message = template filled, plus ` – color – price – link`; origin from `x-forwarded-host`/`host` headers (pure `requestOrigin`, host validated).

## Progress

- 2026-10-21: Document created; user wants the catalog identical to the reference.
- 2026-10-21: T1-T4 implemented with strict TDD, one commit per task.

## Verification evidence

RED observed before each task (module-not-found or failing expectations): T1 `colors/looks/presentation` tests (3 files failed to resolve), then `queries.db` collection tests (2 failed, functions undefined); T2 12 failures (href expectations `/ver-todo...`, topbar action) plus the index page test failing to resolve; T3 carousel, presentation and page tests failing to resolve; T4 9 failures in `whatsapp.test.ts`/`presentation.test.tsx` plus `size-picker.test.tsx` unresolved. GREEN after each implementation.

- `pnpm lint`: Checked 281 files, no fixes needed.
- `pnpm typecheck`: 6 tasks successful.
- `pnpm test`: catalog 23 files / 175 tests, db 175, erp 153, ui 36, pricing 15, all passing.
- `env -u DATABASE_URL pnpm build`: succeeds; catalog routes `/`, `/catalogos/[slug]`, `/producto/[id]`, `/ver-todo`, `/ver-todo/[categoria]` (all dynamic).
- Dev server: `/` 200, `/ver-todo` 200, `/ver-todo?talle=S` lists "75 prendas · talle S", `/vestidos` redirects 307 to `/ver-todo/vestidos`, `/catalogos/nope` 404.
- Screenshots (headless Chrome, 113 published products): `/` at 1180x820 shows topbar, "Colecciones" title and four cards (Casa Icona 18, Milonga 53, Zunilda Gutierrez 17, Átika 25 piezas) with covers. `/catalogos/casa-icona` cover at 1180x820, 820x1180, 390x844: wordmark, eyebrow, cover photo, "Colección seleccionada", "18 piezas · Deslizá para ver", fixed bar with "← Catálogos" and the collection name. `#casa-icona-pagina-2` at 1180x820: photo column left, info right (eyebrow + "02 / 18", name, price, description, color swatch, sizes, disabled "Elegí tu talle"); at 820x1180 and 390x844: photo on top, info panel below with the same content. A piece without photos shows an empty surface box.

## Limitations

- Pieces without photos (a few Milonga rows) show an empty photo area.
- ZAMBA AZUL is a multicolor print per the look index but still shows "Azul" (per the spec's color list).
- Zoom dialog and swipe are covered by unit tests, not exercised in a real browser session.
- `not-found.tsx` renders under the root layout only, so the 404 page no longer has the topbar.

## Next step

Review in the browser on the tablet; decide merge.
