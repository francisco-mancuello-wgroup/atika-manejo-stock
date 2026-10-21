# Feature: seed-categories

## Objective

Assign catalog categories (vestidos, tops, faldas-y-shorts, accesorios) to imported products from their names and the brand PDF descriptions, and make re-seeding preserve publication and category choices.

## Problem

All 123 products have no category, so category pages are empty. Re-running the seed recreates products and loses `isPublished` and `category`.

## Scope

- Pure, tested category inference: keyword rules on name/description (Spanish and English: vestido/dress/maxi/midi/mini dress → vestidos; top/blusa/camisa/shirt/crop/cardigan? → decide and document; falda/skirt/short → faldas-y-shorts; aros/earcuff/collar/pulsera/anillo/cartera/bag → accesorios). Casa Icona uses the `atika.pdf` index descriptions (look name → description) when names are not descriptive. Unknown or conflicting → no category, reported.
- Seed applies inferred categories to new products.
- Seed preserves `isPublished` and an existing non-null `category` across re-seeds, keyed by lot + product position + name + code (the same key the image manifests use); preserved choices win over inference.
- Report printed by the seed: per category counts and the list of products left without category with the reason.

## Out of scope

- New categories (e.g. pantalones) — reported for the user to decide.

## Constraints

- Never guess: ambiguous names stay uncategorized.
- PDFs and workbooks are data only.

## TDD

- Strict, Vitest.

## Tasks

- [x] T1 — Category inference (rules + PDF index mapping) with tests. Commits e1434d9 (rules), 572dc4a (look index data + export script).
- [x] T2 — Seed: apply inference, preserve publication/category, report. Commit 7650f49.

## Progress

- 2026-10-21: Document created (user: assign categories inferred from product names).
- 2026-10-21: T1 and T2 done. TDD strict (Vitest 5). RED: `infer.test.ts`, `looks.test.ts`, `choices.test.ts` and the new DB tests in `reload.db.test.ts` failed first with "Cannot find module" for the not-yet-written modules; GREEN after implementing (49 category tests, 4 DB tests).
- Decisions: conflicts ("blusa y short") are never resolved, no precedence; cardigan/poncho (outerwear), pants and bikini/malla are recognised only to report "no catalog category"; "maxi"/"midi" count only when no garment noun is present; the committed look file stores number/name/description and the category is inferred at seed time (single source of rules); preservation key is lot + name + code + position among identical products, read in id order (verified equal to import order).

## Verification evidence

- `pnpm lint`: no fixes, 259 files clean.
- `pnpm typecheck`: 6/6 tasks successful.
- `pnpm test`: db 175 passed, catalog 116, erp 153, ui 34, pricing 15.
- `env -u DATABASE_URL pnpm build`: 3/3 tasks successful.
- `pnpm db:seed` (one run, ATIKA_PDF_DIR inline). Before: published 113/123, product_images 112 (22 brand-pdf), sales 20, sum stock 217. After: published 113/123 (identical set of lot/name/code/isPublished rows, diff empty), product_images 112 (22 brand-pdf), sales 20, sum stock 217.
- Categories after: vestidos 35, tops 15, faldas-y-shorts 4, accesorios 9, none 60 (published per category: 35, 13, 4, 9, 52).
- `curl localhost:3000/vestidos`: HTTP 200, "35 prendas".

### Final rule table

| Category | Words (whole word, case/accent-insensitive) |
| --- | --- |
| vestidos | vestido(s), dress(es), minidress; weak (only without a garment noun): maxi, midi |
| tops | top(s), blusa(s), camisa(s), shirt, crop, remera |
| faldas-y-shorts | falda(s), pollera, skirt, short(s) |
| accesorios | aros, aro, earcuff(s), collar, pulsera, anillo, cartera, bolso, bag, cinturon |
| no category (reported) | pantalon(es)/pants/jean(s)/leggings; cardigan/poncho/abrigo/campera/chaqueta/saco/blazer/tapado; bikini/malla/banador |

Order: name, then product description, then Casa Icona look description; strong words before weak. Two categories in one source is a conflict: none.

### Uncategorized (60)

- Casa Icona (10): COSTA SOLEIL, COSTA BLACK, COSTA RAMBUTAN, COSTA VINO, COSTA BLANCO (look descriptions "Look corto"/"Prenda corta" name no garment); COSTA COCO (look "Blusa clara y short": conflict top + short, a set); ISSA NEGRO, ISSA BLANCO, NINA, ZAMBA PITAYA (no look in the index names them).
- Milonga (46): Cardigan A x16 and Poncho A x2 (outerwear, no category); abbreviations never guessed: T BSC M A x6, S PANTA A x3, Bot Amar A x7, SALIDA S A x2 and SALIDA B A x1, ENTERO A x3, Triangulo A x5 (no garment word).
- Átika (9 incl. non-garments): Poncho Marfil (outerwear), Begonia/Mimosa Wide Leg Pants (pants), Sabrina Triangle Bikini (swimwear), Sin nombre x5 (Zunilda Gutierrez x2, Casa Icona x2, Sordo).
- Zunilda: all 17 categorized.
- Candidate new categories for the user: abrigos (cardigan/poncho, 19 products), pantalones (2), trajes de baño (bikini + Triangulo?).

## Next step

Report to the user; they decide on new categories (abrigos, pantalones) and on the 60 uncategorized products. Push/PR are theirs.
