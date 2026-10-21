# Inventory seed

`pnpm db:seed` (repository root) resets the imported data and reloads it from the four supplier
workbooks. The workbooks stay outside the repository: set `ATIKA_EXCEL_DIR` in the root `.env`.

```
excel/cells.ts    cell helpers (formula results, rich text, strikethrough, label matching)
excel/notes.ts    parser for the free-text "VENTAS (fecha)" notes
excel/sizes.ts    size normalization
excel/parse.ts    pure workbook -> lot normalization (tested with in-memory workbooks)
excel/load.ts     reads the workbooks from disk and holds per-lot facts the files do not carry
reload.ts         per-lot import (suppliers, lots, products, variants, images, sales) and the table reset
seed.ts           transactional reload plus catalog settings, app settings, admin and the photo copy
images/           workbook photo export (`pnpm db:export-images`) and its seed side (see "Product photos")
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

## Product photos

The workbooks embed one floating drawing per product. `pnpm db:export-images` reads them, writes
`data/product-images/<lot-slug>/<product>.webp` (WebP, long side at most 1600px, quality 82, never
upscaled) and `data/product-images/manifest.json`. The folder is committed; re-running on the same
workbooks gives byte-identical output (the folder is emptied first).

Matching rule: a drawing belongs to the product read from the worksheet row of its **top-left
anchor** (a picture that overlaps further rows still belongs to its anchor row). In the one-row-per-size
layout a product owns all its size rows. A drawing anchored on a header, blank, totals or any other
non-product row is reported as unmatched and never attached to the nearest product; products without a
drawing are reported too. Two drawings on one product become `-2`, `-3` files with positions 0, 1.

Files are named `<lot-slug>/<code-name>.webp`; a repeated stem gets `-2`, `-3` in product order. The manifest
identifies a product by lot name and position in the lot (the order the seed creates them) and also
stores its name and code: the seed refuses a manifest whose names disagree with the workbooks.

`pnpm db:seed` creates a `ProductImage` per manifest entry (position 0 = cover, alt = product name,
url `/media/products/<lot-slug>/<file>.webp`) and copies the files to `apps/catalog/public/media/products`
and `apps/erp/public/media/products` (gitignored, emptied before each copy). Without a manifest the seed
works as before.

## Brand PDF photos

`pnpm db:export-images-pdf` extracts the photos of the three brand PDFs (`atika.pdf` Casa Icona,
`Atika-Catalogo-Aros.pdf` Sordo, `Atika_Milonga_Catalogo_Editorial.pdf`) into
`data/product-images-new/<lot-slug>/<product>.webp` plus `manifest.json`. Set `ATIKA_PDF_DIR` (folder
with the PDFs) and `ATIKA_EXCEL_DIR` in the root `.env`. It needs poppler (`pdftohtml`) installed.
The folder is emptied first, so re-running gives byte-identical output.

```
images-pdf/layout.ts       parses `pdftohtml -xml` (page text with positions, images)
images-pdf/captions.ts     reads product captions per PDF style (numbered looks, sections, none)
images-pdf/pair.ts         photo vs logo filter; pairs photos and captions top to bottom
images-pdf/normalize.ts    name normalization (case, accents, punctuation, trailing letter, colours)
images-pdf/match-names.ts  caption -> product name matching (exact, alias, token-subset)
images-pdf/plan.ts         pure plan: which photo goes to which product, plus the unmatched report
images-pdf/export-pdf.ts   writes the WebP files and manifest (same product key as the workbook export)
```

Matching never guesses: a photo is attached only when its caption names exactly one product of the
right lot (Casa Icona PDF -> Casa Icona, aros PDF -> Sordo products of the Átika lot). A product
claimed by two captions, a caption matching two products, a page whose photo and caption counts differ,
and any photo without a caption are all reported and left unassigned. Every manifest image records its
`page`, `caption` and the `rule` that matched it. The Milonga editorial has no product names (pages
only carry section titles such as "Vestidos"), so none of its photos can be matched.

The aros PDF states "Imágenes recreadas digitalmente" on every page: its photos are digitally
recreated, not photographs of the pieces. They are marked `recreated: true` in the manifest.

Seed precedence: a product with a brand PDF photo gets only the PDF photos (position 0 = cover);
products without one keep their workbook photos. The two are not mixed because the workbook photos
are small thumbnails (Casa Icona 60-130 px) and would only add a blurry look next to the real one.
PDF files are served from `/media/products/brand-pdf/...`; only the files in use are copied.

## Settings rows

`CatalogSettings` is reset on every seed. `AppSettings` (exchange rate 7400, sale factor 2.5, IVA 0.10,
cost 1.0, stored as fractions) is only created when missing, so values edited in the ERP survive a reseed.

## Environment

`.env` at the repository root (see `.env.example`): `DATABASE_URL`, `ATIKA_EXCEL_DIR`, `ADMIN_EMAIL`,
`ADMIN_PASSWORD`.
