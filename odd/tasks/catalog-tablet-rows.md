# Feature: catalog-tablet-rows

## Objective

Replace the public catalog grid with the tablet-first row layout of Propuesta C (`odd/specs/catalog-tablet-c.md`): category rail, size filter, sort, search, product rows and a detail sheet with WhatsApp contact.

## Problem

The catalog is a 4-column grid designed for desktop; the store uses it mainly on a tablet.

## Scope

- Layout by width: landscape (≥1024) with left rail; portrait (640–1023) with category tabs and size chips row; phone (<640) compact.
- Filtering through URL search params (shareable, server-rendered): category (existing `/[categoria]` routes, `novedades` = all), `talle` (only products with stock in that size), `q` (name/brand search), `orden` (`recientes` default, `precio-asc`, `precio-desc`). Category counts in the rail honor the current size filter and catalog settings.
- Product rows per spec; detail sheet opened by `?p=<productId>` (server-rendered, deep-linkable, close = same URL without `p`; Escape and scrim click close it on the client); size selection inside the sheet (client) and WhatsApp link via the existing `buildWhatsappUrl`.
- `/producto/[id]` keeps working (full page) for direct links.
- Remove the grid card component if unused.

## Out of scope

- Infinite scroll / pagination (113 products render fine; revisit later).
- ERP changes.

## Constraints

- Catalog never exposes costs, lots data, stock counts or sales (keep the safety tests; detail line may use color/description only).
- Builds pass without `DATABASE_URL`; data pages dynamic.
- Accessibility: rows are buttons/links with accessible names; sheet is a dialog (`role="dialog"`, `aria-modal`, labelled by the product name, focus moves into it and returns on close).

## TDD

- Mode: strict. Runner: Vitest + Testing Library.

## Delivery

- Stacked-to-main. Branch `feat/catalog-tablet-rows`. Commits per task.

## Tasks

- [ ] T1 — Query layer: filters (talle, q, orden) + category counts; tests.
- [ ] T2 — Layout: topbar with search, rail (landscape) / tabs + chips (portrait/phone), list header with count and sort.
- [ ] T3 — Product rows per spec.
- [ ] T4 — Detail sheet (`?p=`) with size selection and WhatsApp.

## Progress

- 2026-10-21: Document created; user approved Propuesta C ("me gusta, implementalo").

## Verification evidence

_None yet._

## Next step

Delegate T1–T4 to one writer.
