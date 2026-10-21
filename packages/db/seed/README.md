# Inventory seed

`pnpm db:seed` (repository root) resets the imported data and reloads it from the four supplier
workbooks. The workbooks stay outside the repository: set `ATIKA_EXCEL_DIR` in the root `.env`.

```
excel/cells.ts    cell helpers (formula results, rich text, strikethrough, label matching)
excel/notes.ts    parser for the free-text "VENTAS (fecha)" notes
excel/sizes.ts    size normalization
excel/parse.ts    pure workbook -> lot normalization (tested with in-memory workbooks)
excel/load.ts     reads the workbooks from disk and holds per-lot facts the files do not carry
seed.ts           transactional reload: suppliers, lots, products, variants, sales, settings, admin
password.ts       scrypt hashing helper (shared with the ERP login)
```

## How the parser reads a workbook

The first sheet with data is used. Columns are found by header label (accents and case ignored),
not by position:

| Meaning        | Header labels                                                         |
| -------------- | --------------------------------------------------------------------- |
| name           | `DESCRIPCION`, `NOMBRE`                                               |
| code           | `CODIGO`, `REFERENCIA`                                                |
| colour / brand | `COLOR`, `MARCA`                                                      |
| original value | `VALOR ORIGINAL`                                                      |
| quantity       | `CANTIDAD`                                                            |
| unit cost USD  | `COSTO UNITARIO USD`                                                  |
| sizes          | columns whose header starts with `TALL` (`TALLES`, `TALLAS`, `TALLE`) |
| sales          | header starting with `VENTAS`                                         |

Two layouts exist:
- **One row per size** (Casa Icona): a `TALLES` column holds the size and `CANTIDAD` its count. The
  "unit cost" column holds the row's TOTAL cost, so it is divided by the quantity. Consecutive rows
  of the same model become one product with several variants.
- **One row per model** (Milonga, Zunilda, Átika): a second header row names each size column and the
  cell holds the units. Sizes are `U, XS, S, M, L, XL`; Milonga also has the combined sizes `XS/S` and
  `M/L`, kept as their own variants (see open questions).

Data rules applied (see `odd/tasks/excel-import.md`):
- Exchange rate: derived per row from the Gs and USD price columns (`PRECIO UNITARIO` pair, else
  `COSTO UNITARIO` pair); the lot uses the most common value and any other row is reported as a warning.
- Shipping: the lot total is configured in `excel/load.ts` (the header text only mentions it);
  Gs totals are converted with the lot exchange rate. `@atika/pricing` prorates it over units bought.
- Sale factor 2.5 and IVA 10 % for every lot. Workbook prices are never imported.
- Cost rate: when the workbook has an original value column and every unit cost is the same share of
  it, that share is the lot cost rate (Casa Icona: 0.55); otherwise 1 with the unit cost as value.
- A struck-through size cell (or, in the one-row-per-size layout, a struck size or quantity cell) is a
  sale. A note such as `1 (S) - 23/06/2026`, `XS -16/12/2025` or a bare date also records a sale; a
  note and a struck cell for the same size are counted once (the larger quantity wins). Stock is
  units bought minus units sold.
- Lot purchase date: the workbook creation date (the files carry no purchase date).
- Brand: the `MARCA` column, else the supplier name.

## Per-workbook mapping

| Workbook   | Layout            | Notes                                                                                    |
| ---------- | ----------------- | ---------------------------------------------------------------------------------------- |
| Casa Icona | one row per size  | name only (no code/colour), original value, struck whole rows, shipping in USD           |
| Milonga    | one row per model | `REFERENCIA` code, colour, combined sizes, struck cells plus sized notes, shipping in Gs |
| Zunilda    | one row per model | code and colour, struck size cells, notes `SIZE -date`, shipping in Gs                   |
| Átika      | one row per model | brand column, unit cost in USD and Gs (rate per row), `Date` sale cells, no shipping     |

## Environment

`.env` at the repository root (see `.env.example`): `DATABASE_URL`, `ATIKA_EXCEL_DIR`, `ADMIN_EMAIL`,
`ADMIN_PASSWORD`.
