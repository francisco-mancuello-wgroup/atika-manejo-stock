# Feature: bank-promos

## Objective

Let the owner publish bank card promotions (installments, refunds, discounts) from the ERP (Promos → Bancos) and show them to customers in the catalog, like Nissei's "¡Nuestras promociones bancarias!" block.

## Decisions (user, 2026-10-22)

- Informational only: bank promos never change list prices, discounts or sales.
- Scope per promo: all products, selected lots, or selected products.
- Reference: Nissei product page (benefit headline, e.g. "Hasta 12 cuotas", with bank logos below; link "Ver bases y condiciones").

## Scope

### Data (packages/db)

- `Bank`: name (unique), optional logo image (stored like product photos), createdAt/updatedAt.
- `BankPromo`: kind (`installments` | `refund` | `discount`), value (installments: integer 2–48; refund/discount: percent 1–100), optional days of week (subset of Mon–Sun; empty = every day), optional cap in ₲ (`capGs`), optional startsAt/endsAt (`@db.Date`, inclusive, Asunción calendar like Discount), optional terms text, isActive, scope (`all` | `lots` | `products`), banks (≥1, join table), lots / products join tables (used only for their scope), timestamps.
- Migration; seed untouched.

### Pure rules (shared, next to the discount rules in packages/pricing or a similar shared package both apps already import)

- `isPromoLive(promo, now)`: active, inside its window (Asunción day), and today's weekday is allowed.
- `promosForProduct(promos, {productId, lotId}, now)`: live promos whose scope covers the product.
- `promoHeadline(promo)`: "Hasta 12 cuotas sin intereses", "20 % de reintegro", "15 % de descuento", plus " · Jueves" / " · Lunes y jueves" and " · Tope ₲ 200.000" when present.
- Group for display: by headline, banks merged, ordered installments (desc value) → refund → discount.

### ERP (Promos → Bancos, /promos/bancos)

- Banks management: list + create/edit/delete (name, logo upload, preview; fallback shows name). Deleting a bank used by promos is refused with a clear message.
- Promos list like Descuentos: headline, banks, scope summary ("Todos los productos" / "3 lotes" / "12 productos"), window, status (Vigente / Programada / Vencida / Inactiva), active switch, edit, delete.
- Promo form: kind, value, banks (checkboxes with logos), days of week, cap, window, terms, scope radios (Todos / Lotes / Productos) with lot checklist or the existing product picker (reuse Descuentos' picker). Validation in Spanish.
- All server actions guarded by requireSession (actions guard test).

### Catalog (apps/catalog)

- Product sheet / size picker area: block "Nuestras promociones bancarias" with grouped headlines and bank logos (name chip when no logo). Hidden when no promo applies.
- Link "Ver bases y condiciones" to a page `/promociones-bancarias` listing every live promo with banks, days, cap, window and terms.
- Read from DB with the same "today in Asunción" rule as discounts.

## TDD

- Strict, Vitest in each package (`pnpm --filter <pkg> test`); DB tests roll back.

## Tasks

- [x] T1 — Schema + migration + pure rules (live, scope, headline, grouping) with tests.
- [x] T2 — ERP banks management (CRUD + logo) with tests.
- [x] T3 — ERP promos list + form (scope all/lots/products) with tests.
- [x] T4 — Catalog block on the product sheet + bases y condiciones page with tests.

## Progress

- 2026-10-22: Document created.
- 2026-10-22 T1: `Bank`, `BankPromo` (+ bank/lot/product join tables) and migration `20261022030000_bank_promos`; days stored as `Int[]` (ISO 1=Monday..7=Sunday); logo stored as `Bank.logoUrl`; pure rules in `packages/pricing/src/bank-promo.ts` (exports `isPromoLive`, `promosForProduct`, `promoHeadline`, `groupPromosForDisplay`, `asuncionDay` shared with discounts). Deleting a bank in use is blocked at DB level (`ON DELETE RESTRICT`).
- 2026-10-22 T2: /promos/bancos now shows `BanksView` (inline create/edit, logo upload, "Quitar logo", delete with confirmation). Logos reuse the product-photo pipeline (`prepareUpload` with a 400 px longest side, WebP) and are stored by `LogoStorage` under `/media/banks/uploads/<bankId>/<uuid>.webp` in both apps' `public/` (same approach as product photos). Name is unique case-insensitively; deleting a bank used by promos is refused with the count ("lo usan N promociones"). Generic `ConfirmDeleteButton` and `BankLogo` (logo or name chip) added for reuse by T3.
- 2026-10-22 T3: /promos/bancos shows the promos list (`BankPromosView`: headline, bank logos, scope summary, window, status Vigente/Programada/Vencida/Inactiva, active switch, edit, delete) above the banks section; `/promos/bancos/nueva` and `/promos/bancos/[id]` host `BankPromoForm` (kind, value, cap with thousands dots, banks, weekdays, window, terms, scope all/lots/products with the existing picker). All actions live in `promos/bancos/actions.ts` behind `requireSession`. Schema normalizes all 7 days to "every day" (empty array); a bank deleted while the form is open yields "Elegí bancos que existan.". `optionalDate`/`checkbox` moved to `lib/form.ts` (discounts now import them).
- 2026-10-22 T4: the "Nuestras promociones bancarias" block (`BankPromosBlock`) is shown (a) in the product sheet (`ProductSheet`, used by /ver-todo) between description and the WhatsApp button and (b) on every lookbook page (`AddToCart`, home and /catalogos/[slug]) above the "Agregar al carrito" button, following the chosen color and merging the garments of a set. Not added to the legacy `/producto/[id]` page nor the unused `Presentation`/`SizePicker` components. `/promociones-bancarias` lists every live promo (headline, banks, window, scope, terms). Promos are read per request with the same Asunción-day rule (`isPromoLive`), hidden while prices are hidden.

## Verification evidence

- T1 RED: `pnpm --filter @atika/pricing test` -> 21 failed (rules not implemented). GREEN: 48 passed. Schema DB test (`apps/erp/src/lib/bank-promos/schema.db.test.ts`) written after the migration (declarative schema): 4 passed; no RED observed for it. `packages/db/src/schema.test.ts` model list updated.
- T2 RED: new tests for logo storage, schema, save (DB), queries (DB), BanksView, `prepareUpload` custom side and the actions guard -> 7 files failed (missing modules) + 2 assertion failures. GREEN: erp 438 tests passed. Note: Vitest's content-hash cache kept a stale `import.meta.glob` result for `actions-guard.test.ts` after the RED run; `rm -rf node_modules/.vitest-cache` fixes it (not a code issue).
- T3 RED: tests for schema, format, save (DB), queries (DB), BankPromosView and BankPromoForm -> 6 files failed (missing modules). GREEN: erp 497 tests passed (78 files).
- T4 RED: pricing (7 failed: value/sortPromosForDisplay/mergePromoGroups), catalog (3 new files failing on missing modules + 9 failing tests: sheet, add-to-cart, 5 DB). GREEN: pricing 55, catalog 246 passed after updating the sheet-detail key whitelist test (`bankPromos` is an intentional public field).
- T4 commit: 6b1610c `feat(catalog): show bank promos on products`.
- T3 commit: 2e89f2d `feat(erp): bank promos list and form`.
- T2 commit: a65a47d `feat(erp): manage banks`.
- T1 commit: 39b2d38 `feat(db): bank promos schema and rules`.

- Final: `pnpm test` all green (ui 36, pricing 55, db 190, catalog 246, erp 497); `pnpm typecheck` 6/6; `pnpm lint` only the 2 known warnings. Manual check pending: running dev servers hold a Prisma client generated before the migration and fail on `bankPromo` until restarted (`pnpm db:migrate` already applied locally).

## Next step

Restart the ERP and catalog dev servers, create a bank and a promo in /promos/bancos and check the block on a product.
