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
categories/       category inference, Casa Icona look index and re-seed preservation (see "Categories")
images/           workbook photo export (`pnpm db:export-images`) and its seed side (see "Product photos")
../src/password.ts  scrypt hashing helper (`@atika/db/password`, shared with the ERP login)
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

Photos that match no product are saved too (same WebP optimization) as
`data/product-images-new/sin-asignar/<pdf-slug>/p<NN>-<caption or sin-texto>[-n].webp`, and each
`unmatchedImages` entry of the manifest carries that `file`. The seed ignores `sin-asignar/`: only
matched photos are linked. Logos and decoration are never saved.

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

## Owner account (ERP login)

`admin.ts` upserts the single ERP user by lowercase email and stores only a scrypt hash
(`@atika/db/password`). The ERP has no sign-up or reset screen, so this is how the account is created
and how its password is rotated. `ADMIN_PASSWORD` needs at least 8 characters (a longer passphrase is recommended).

```bash
# create the owner, or change the password of the existing account
ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD='a-long-unique-passphrase' pnpm db:seed
```

Variables set on the command line win over `.env`, so the real password never has to be written to a
file (keep it out of `.env.example`, shell history helpers and commits). The seed also reloads the
workbook data, so it needs `ATIKA_EXCEL_DIR` and `DATABASE_URL` as usual. Rotating the password does not
end existing sessions; to force a sign-out everywhere run `DELETE FROM sessions;` against the database.

### Adding more ERP users without reseeding

`pnpm db:seed` recreates products from the workbooks, so it wipes ERP edits, uploaded photos and
registered sales. To create another user (or rotate a password) on a database already in use, run the
standalone command, which only touches the `users` table:

```bash
USER_EMAIL=someone@example.com USER_PASSWORD='a-long-unique-passphrase' pnpm db:user
```

Same rules as the admin account: lowercase email, at least 8 characters, only the scrypt hash is stored.
Signed-in users can change their own password in ERP → Seguridad.


## Categories

`categories/infer.ts` assigns a catalog category from the product name, then its description, then the
brand's look description. Whole words only, case and accents ignored, Spanish and English.

| Category         | Words                                                                         |
| ---------------- | ----------------------------------------------------------------------------- |
| vestidos         | vestido, dress, minidress; only when nothing stronger is present: maxi, midi  |
| tops             | top, blusa, camisa, shirt, crop, remera                                       |
| faldas-y-shorts  | falda, pollera, skirt, short(s)                                               |
| accesorios       | aros, earcuff, collar, pulsera, anillo, cartera, bolso, bag, cinturon         |
| (none, reported) | pants/pantalon/jean, cardigan/poncho/abrigo/campera/saco/blazer, bikini/malla |

Never guessed: no keyword, two categories at once ("blusa y short") and abbreviations ("T BSC M",
"S PANTA", "Bot", "SALIDA", "ENTERO") leave the product uncategorized with a reason. The seed prints the
count per category and the list of products without one.

Casa Icona names are not descriptive (COSTA VINO, NINA). `data/catalog-categories/casa-icona-looks.json`
holds the look index of `atika.pdf` (number, name, one-line description), produced by
`ATIKA_PDF_DIR=... pnpm db:export-looks`. The seed matches products to looks with the PDF photo name
rules and infers from the look description, so it does not need the PDF. PDF text is data only.

Re-seeding keeps what the admin set: `isPublished` and a non-null `category` are read before the delete and
restored by lot + name + code + position among identical products. A preserved category wins over
inference; a product never seen before is hidden.

## Lookbook

The public catalog shows only the three brand PDFs: Casa Icona (lot "Casa Icona", 18 looks), Milonga
(lot "Milonga", pages of the editorial PDF; the pieces of one set share a page) and Sordo (Sordo pieces of
the Átika lot). `data/catalogs/lookbook.json` places each piece: `lot`, `code` and `name` (the workbook
name, used only to find the product), `catalog` (`casa_icona` | `milonga` | `sordo`), `order` (look
number, PDF page or piece), `section`, `catalogName` (the lookbook display name; `Product.name` never
changes) and `cover`. Prices always come from the lot formula; there is no fixed price.

`categories/lookbook.ts` matches a row by lot + code, then exact name, then normalized name (case, accents,
punctuation); a row matching no product or several products is printed by the seed and never guessed.
A product whose stored placement has no catalog takes the row's placement and is published; a placement
set in the ERP (and a stored US$ price) wins on every later seed.

`cover` is a PDF page photo relative to `data/product-images-new`, for pieces the PDF export could not
match by caption (Milonga pages and four Casa Icona looks with generic captions, taken from `sin-asignar/`).
It becomes the product's only image; pieces without `cover` keep their brand PDF photo.

## Photos uploaded from the ERP

Product photos uploaded in the ERP (`/inventario/[id]`, `/inventario/nuevo`) are optimized to WebP and written to
`apps/erp/public/media/products/uploads/<productId>/` and `apps/catalog/public/media/products/uploads/<productId>/`
(both gitignored), with a `ProductImage` row each. The seed recreates products from the workbooks, so re-seeding
**does not preserve uploaded photos or edits made in the ERP products form** (the files stay on disk but nothing points
to them). Storage sits behind the `PhotoStorage` interface (`saveProductPhoto`, `deleteProductPhoto`) in
`apps/erp/src/lib/products/photo-storage.ts` so it can move to cloud storage later.

## Banks

`pnpm db:banks` (also run at the end of `pnpm db:seed`) creates the Paraguayan banks listed in
`data/bank-logos/manifest.json` and points each one at its logo, `/media/banks/seed/<slug>.webp`.
The `.webp` files (max 400px, transparent) are copied into `apps/{erp,catalog}/public/media/banks/seed/`
(gitignored).
- Banks match by name ignoring case; existing banks are never deleted and promos are never touched.
- A logo uploaded from the ERP (`/media/banks/uploads/...`) is never replaced.
- A manifest entry with `"file": null` is seeded without a logo; add the `.webp` to `data/bank-logos/`,
  set `file`, and re-run to link it (or upload it from Promos → Bancos).
- Logos came from each bank's official site (`sourceUrl` in the manifest); only those that were
  readable on a light background are included.
