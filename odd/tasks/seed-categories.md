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

- [ ] T1 — Category inference (rules + PDF index mapping) with tests.
- [ ] T2 — Seed: apply inference, preserve publication/category, report.

## Progress

- 2026-10-21: Document created (user: assign categories inferred from product names).

## Verification evidence

_None yet._

## Next step

Delegate.
