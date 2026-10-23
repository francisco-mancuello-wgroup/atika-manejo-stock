# Feature: delete-product

## Objective

The owner can delete a product loaded by mistake from the ERP, as long as it has no sales.

## Problem / why

User request 2026-10-23: "si cargo un producto y no tiene ventas tengo que poder eliminar, porque a veces lo cargo por error". Decisions: the "Eliminar producto" button is always visible; enabled only when the product has no sales; with sales it shows disabled with the reason ("las ventas conservan su historial"). Inventory order stays alphabetical.

## Scope

- ERP product edit page: "Eliminar producto" button with confirmation; disabled + explanation when any variant has sales (or order items, if they reference variants).
- Server action + domain `deleteProduct`: in one transaction re-checks no sales, deletes group allocations (only those with `sold = 0`; any sold > 0 blocks), variants, images, discount/bank-promo links, the product; then deletes uploaded photo files through the existing PhotoStorage (seed photos untouched); bumps the catalog version; redirects to the inventory with a "Producto eliminado." notice.

## Constraints

- UI copy Spanish (voseo), code/comments English. Auth guard like every action (actions-guard list).

## TDD

- Strict, Vitest; DB tests with `withRollback` on the local Docker DB (localhost:5436). RED before GREEN.

## Tasks

- [ ] T1 — Domain + action: `deleteProduct` with the sales check and cleanup, tests.
- [ ] T2 — ERP UI: always-visible button, confirmation, disabled state with reason, notice after delete, tests.

## Progress / evidence

- Branch `feat/delete-product` from `feat/brand-lookbook` (951080a).

## Next step

T1.
