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

- [ ] T1 — Data: collections (slug, name, cover, published count), presentation view model per collection (photos, color, description, sizes, price), tests.
- [ ] T2 — Routes: `/` collections index, move rows list to `/ver-todo`, links updated.
- [ ] T3 — Presentation page: cover + product sections, layout per spec, carousel + zoom.
- [ ] T4 — Size picker + WhatsApp button behavior and message.

## Progress

- 2026-10-21: Document created; user wants the catalog identical to the reference.

## Verification evidence

_None yet._

## Next step

Delegate T1–T4 to one writer.
