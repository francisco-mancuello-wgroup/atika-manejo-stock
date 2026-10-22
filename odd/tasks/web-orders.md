# Feature: web-orders

## Objective

Orders placed from the public catalog cart are saved, the ERP lists them under "Ventas → Pedidos", and approving an order registers all its sales in one click.

## Problem / why

User request 2026-10-22: today "Pagar" in the catalog cart only opens WhatsApp with a text; the cart lives in the visitor's `localStorage` and nothing reaches the server (`apps/catalog/src/lib/cart.ts` `orderMessage`, `components/lookbook/cart.tsx`). The owner wants to see what the customer sent, approve or reject it, and register sales faster.

User decisions 2026-10-22:
- Approve = register the sales of every line automatically (order prices) and decrement stock; all-or-nothing.
- Reject = mark rejected, stock untouched.
- Pending orders do NOT reserve stock (fake orders can't block pieces).
- The cart asks no customer data; the customer is identified via WhatsApp.

## Scope

- Data: `Order` (sequential human number, status pending/approved/rejected, createdAt, decidedAt) and `OrderItem` (variant, quantity, unit price snapshot, discount percent, product name/size/colour snapshot). `Sale.orderId` optional, so approved sales trace back to their order.
- Catalog: "Pagar" first saves the order through a server action, then opens WhatsApp with "Pedido #NNNN" in the message. Prices/discounts are computed on the server (never trusted from the client). If saving fails, WhatsApp still opens with the message as today (no number). Basic abuse limits (max lines/quantity per order, unknown/out-of-stock variants rejected or dropped).
- ERP: "Ventas" sidebar entry becomes a dropdown (same NavDropdown pattern as "Promos") with "Registradas" (/ventas, today's page) and "Pedidos" (/ventas/pedidos: list with number, date, items count, total, status; filter by status, pending first). Order detail shows lines (piece, size, colour, qty, price, current stock) and Aprobar / Rechazar for pending orders.
- Approve: one transaction registering one sale per line through the existing sale registration logic (stock decrement, group consumption), `chargedGs` = order unit price (null when equal to today's list price), `orderId` set; if any line lacks stock, nothing is registered and the ERP shows which line failed.

## Constraints

- UI copy Spanish (voseo); code/comments English.
- Keep Francisco's cart design and copy; only add the order number and the save step.
- Never write stock on order creation.

## TDD

- Strict (session config), Vitest: `pnpm --filter <pkg> test` / `pnpm exec vitest run <files>`; DB tests use `withRollback`. Observe RED before GREEN.

## Tasks

- [x] T1 — Data + domain: Order/OrderItem/status enum/`Sale.orderId`, migration, `createOrder` (server-side pricing, limits), tests.
- [x] T2 — Catalog: "Pagar" saves the order and opens WhatsApp with its number; failure fallback, tests.
- [x] T3 — ERP: Ventas dropdown, /ventas/pedidos list and order detail, tests.
- [x] T4 — ERP: approve (all-or-nothing sales registration) and reject actions, tests.

## Acceptance criteria

- A cart checkout creates a pending order with server-computed prices and the WhatsApp message carries its number.
- The ERP lists it under Ventas → Pedidos; its detail shows what the customer asked for.
- Approving registers one sale per line, decrements stock and marks the order approved; with a line out of stock nothing changes and the reason is shown.
- Rejecting marks it rejected without touching stock.
- lint, typecheck, db/erp/catalog tests and both builds pass.

## Delivery

- Strategy: ask-on-risk; forecast ~900 authored lines (over the ~400 budget). Repository practice: feature branches merged --no-ff into main by the user, no PRs. Branched from feat/sale-form-search (00790e2), which is not merged yet. RDD: off (global).

## Progress

- 2026-10-22: Document created (branch feat/web-orders from feat/sale-form-search 00790e2).

- 2026-10-22: T1 done. Models Order (`number` autoincrement sequence), OrderItem, enum OrderStatus, Sale.orderId (migration 20261022090000_web_orders). `createOrder` lives in apps/catalog/src/lib/orders.ts (it reuses the catalog's own queries `getCatalogSettings` + `getProductDetail`, so prices/discounts/web visibility are exactly what the pages show; the ERP never needs it). Decisions: max 20 lines, quantity 1..10 per piece+size (repeated lines merged, merged total limited); any line not on the web today (unknown id, hidden, size missing, sold out for the web) rejects the whole order (`unavailable`) so the record always matches what the customer saw; quantity above web stock is NOT rejected (the ERP shows current stock and approval is all-or-nothing); store with hidden prices rejects (`prices_hidden`, no price to record). Callers fall back to plain WhatsApp on any rejection.
- 2026-10-22: T2 done. Server action `placeOrderAction` (apps/catalog/src/app/actions.ts) wraps `createOrder` and returns `{number}` or null (never throws). `Pagar` keeps its anchor (href = today's message, works without JS); onClick opens a blank tab synchronously (`window.open("", "_blank")`, allowed because it is inside the click), saves the order (`saveOrder`, 5 s timeout, any failure = null), then points the tab at WhatsApp (`opener = null`). If the browser blocks the tab, this tab navigates to WhatsApp (cart stays in localStorage). Re-taps while saving are ignored. The message ends with a "Pedido #0042" line; no number when saving failed.
- 2026-10-22: T3 done. Sidebar "Ventas" is a NavDropdown (Registradas = exact match on /ventas so it isn't also marked on /ventas/pedidos; Pedidos). /ventas/pedidos lists pending first (all) then decided (latest 200), filter via `?estado=pending|approved|rejected` rendered as links; /ventas/pedidos/[id] shows lines with current stock and a "Sin stock suficiente" flag when stock < quantity. Queries in apps/erp/src/lib/queries/orders.ts.
- 2026-10-22: T4 done. \`approveOrder\`/\`rejectOrder\` in apps/erp/src/lib/orders/decide.ts; server actions in ventas/pedidos/actions.ts (requireSession first). The guard is a conditional \`updateMany where status = pending\` run first inside the transaction (a concurrent/double decision waits on the row lock, then matches nothing and reports "ya fue aprobado/rechazado"). Sales go through the existing \`registerSale\` (only change: optional \`{orderId}\` 4th argument); \`chargedGs\` = order unit price, which registerSale stores as null when equal to today's list price. Any short line throws inside the transaction: everything rolls back and the message names the line. Buttons ask for confirmation. Pending status badge stays visible next to the buttons.

## Verification evidence

- T1 RED: `pnpm exec vitest run src/schema.test.ts src/order.db.test.ts` (packages/db): 5 failed (no Order/OrderItem models, no orderId); `pnpm exec vitest run src/lib/orders.db.test.ts` (apps/catalog): file failed (module ./orders not found).
- T1 GREEN: db package `pnpm --filter @atika/db test`: 34 files, 227 tests passed; catalog orders.db.test.ts 6 passed, `pnpm --filter @atika/catalog test`: 35 files, 279 passed; `prisma migrate diff` vs schema: no difference; catalog typecheck ok. DB tests ran against the local Postgres (not skipped). Commits 170f5cd (db), a72c621 (catalog).

- T2 RED: `pnpm exec vitest run src/lib/checkout.test.ts src/lib/cart.test.ts src/components/lookbook/cart.test.tsx src/app/actions.test.ts` (apps/catalog): 3 files failed to import (checkout, actions missing), 2 cart tests failed (formatOrderNumber not a function).
- T2 GREEN: same command passes; `pnpm --filter @atika/catalog test`: 38 files, 294 passed; catalog typecheck ok; biome clean. Commit 5ef3c3c.

- T3 RED: `pnpm exec vitest run src/components/sidebar.test.tsx src/lib/orders src/lib/queries/orders.db.test.ts src/components/orders-view.test.tsx src/components/order-detail-view.test.tsx` (apps/erp): 4 files failed (modules missing), 3 sidebar tests failed (Ventas still a link).
- T3 GREEN: same command passes; `pnpm --filter @atika/erp test`: 110 files, 785 passed (DB test ran, not skipped); erp typecheck ok. Commit 4b86cb3.

- T4 RED: \`pnpm exec vitest run src/lib/orders src/components/order-decision.test.tsx src/components/order-detail-view.test.tsx "src/app/(erp)/ventas/pedidos"\` (apps/erp): 4 files failed (decide, order-decision, actions missing) + 1 detail test failed (no buttons). DB tests use a savepoint-based \`dbOverSavepoint\` helper so rollback of a failed approval is real.
- T4 GREEN: same command passes (with sales register tests: 9 files, 71 tests); \`pnpm --filter @atika/erp test\`: 114 files, 807 passed. Commit d9bf8be.
- Final: \`pnpm lint\`: 0 errors, 2 pre-existing warnings; \`pnpm typecheck\`: 6/6 ok; db 227, erp 807, catalog 294 tests passed (DB tests ran against local Postgres); \`pnpm --filter @atika/erp build\` and \`@atika/catalog build\`: ok (routes /ventas/pedidos and /ventas/pedidos/[id] listed).
- Not verified: a true two-connection concurrent approval (the guard is covered sequentially and by SQL semantics); no manual browser run of the catalog popup flow (jsdom tests only).

## Next step

User: review the branch (not pushed), try the flow in the browser (cart Pagar, ERP Pedidos), then the merge/push decision. Migration 20261022090000_web_orders must be applied (pnpm db:migrate) wherever this is deployed.
