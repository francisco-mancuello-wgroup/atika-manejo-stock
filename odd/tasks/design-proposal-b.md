# Feature: design-proposal-b

## Objective

Apply the chosen visual direction "Propuesta B" (from the brand PDF) to the shared UI package and both app shells.

## Problem

`packages/ui` and the app shells implement Propuesta A (Inter + Fraunces, rounded corners, neutral grey palette). The user chose Propuesta B on 2026-10-21.

## Why

Every later feature builds on these tokens and chrome; switching now avoids restyling real screens later.

## Scope

- Theme tokens and fonts in `packages/ui`.
- Square-corner primitives (Button, Input); Switch keeps its pill track.
- ERP sidebar and catalog topbar restyled to match the B screens in `atika.pen`.

## Out of scope

- Real logo asset (wordmark stays live text in Unbounded until the user provides the file).
- Real screens (lots, sales, catalog pages) — later features.

## Design reference (atika.pen, Propuesta B)

| Token         | Value                                |
| ------------- | ------------------------------------ |
| bg            | #F4F1EC                              |
| surface       | #FAF8F4                              |
| subtle        | #EBE6DD                              |
| line          | #D6CFC3                              |
| ink / accent  | #141311                              |
| muted         | #6A645B                              |
| sand          | #D8C9B0 (offset block behind photos) |
| warn / warnbg | #9A4A1E / #EFE0CE                    |
| ok            | #4A6B4F                              |
| wa            | #2F6B4A                              |

Fonts: Inter (body/UI), Cormorant Garamond (titles, prices, large figures), Unbounded Light (wordmark "átika"). Captions: tracked uppercase. Corners: square. Sidebar: wordmark + "CASA ICONA" eyebrow, active item marked by a 2px ink bar on the left, exchange-rate footer as a top rule with a serif figure.

## Constraints

- UI copy in Spanish; code in English.
- Do not change pricing, db, or app behavior.

## TDD

- Mode: strict (session configuration). Runner: Vitest. Update/add tests for changed behavior first (RED), then implement.

## Delivery

- Strategy: stacked-to-main (cached from atika-foundation). Branch `feat/design-proposal-b`. Forecast ~250 authored lines.

## Tasks

- [x] T1 — Theme: B color tokens, `sand` token, fonts (Inter, Cormorant Garamond, Unbounded) wired via `next/font` in both apps, square corners for Button/Input.
  - Accept: tests cover token-driven classes still applied; build output contains `--color-sand`; lint/typecheck/test/build pass.
- [x] T2 — Chrome: ERP sidebar and catalog topbar match B (wordmark "átika", eyebrow, active nav bar with `aria-current="page"`, TC footer); catalog home heading in Cormorant.
  - Accept: smoke tests assert wordmark, eyebrow and `aria-current` on the active item; all checks pass.

## Progress

- 2026-10-21: Document created; user chose Propuesta B.
- 2026-10-21: T1 done (commit 2b937aa). T2 done (commit 59b34ba).

## Verification evidence

- T1 RED: 14 tests failed (Button/Input `rounded-none`, 12 token/font assertions in new `globals.test.ts`). GREEN: `@atika/ui` 31 passed. Switch keeps `rounded-full` (test added).
- T2 RED: 3 tests failed (sidebar wordmark/eyebrow with `font-logo`, sidebar TC footer, topbar wordmark/eyebrow). GREEN: erp 6 passed, catalog 5 passed.
- `pnpm install`: up to date. `pnpm lint`: 56 files, no issues. `pnpm typecheck`: 6/6 successful. `pnpm test`: 6/6 successful (pricing 15, ui 31, db 6, catalog 5, erp 6).
- `env -u DATABASE_URL pnpm build`: 3/3 successful; built CSS in both apps contains `--color-sand`.
- Commits: 2b937aa feat(ui) theme tokens and fonts; 59b34ba feat(apps) sidebar and topbar.

## Next step

Merge to `main`.
