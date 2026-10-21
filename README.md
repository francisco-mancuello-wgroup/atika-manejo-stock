# atika

Clothing stock management for atika: an admin ERP and a public catalog that share one database and one pricing formula.

## Layout

| Path               | Purpose                                                     |
| ------------------ | ----------------------------------------------------------- |
| `apps/erp`         | Admin ERP: lots, inventory by size, sales, catalog settings |
| `apps/catalog`     | Public catalog; customers contact via WhatsApp              |
| `packages/pricing` | Price formula (single source of truth)                      |
| `packages/db`      | Prisma schema, migrations and client                        |
| `packages/ui`      | Tailwind theme tokens and shared components                 |
| `packages/config`  | Shared TypeScript configs                                   |

## Requirements

- Node 24 (`.nvmrc`)
- pnpm 11

## Commands

```bash
pnpm install
pnpm dev        # run all apps
pnpm test       # unit tests (Vitest)
pnpm typecheck
pnpm lint       # Biome
pnpm format     # Biome with fixes
pnpm build
```

## Local database

A single `.env` at the repository root is shared by the Prisma CLI, the seed and the apps. Copy `.env.example` to `.env` and adjust it.

```bash
pnpm db:up       # start the atika-postgres container (postgres:18, host port 5436)
pnpm db:migrate  # apply migrations (prisma migrate deploy)
pnpm db:seed     # reset and reload data from the inventory workbooks in ATIKA_EXCEL_DIR
```

## Pricing

Parameters are set per purchase lot and recalculated on save:

```
shipping per unit = total shipping USD ÷ units in lot
unit cost USD     = original value × cost % + shipping per unit
price Gs          = unit cost × sale factor × (1 + IVA) × exchange rate, rounded to ₲ 1.000
```

## Work tracking

Feature documents live in `odd/tasks/`.
