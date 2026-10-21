# Propuesta C — tablet catalog in rows (atika.pen)

Frames: `Nbq8p` "C · Catálogo tablet · Filas" (1180×820), `jP3le` "C · Catálogo tablet · Filas + detalle", `VrPi9` "C · Catálogo tablet vertical · Filas" (820×1180). Tokens: B palette (bg, surface, subtle, line, ink, muted, sand, wa), fonts Inter (sans) and Cormorant Garamond (display). Square corners. Touch targets 40–56px.

## Landscape (≥ 1024px wide)

- Topbar (surface, bottom border, padding 16×32): wordmark + "CASA ICONA" eyebrow (9px, tracking 2) left; search box 360×44 (bg, 1px line border, search icon, placeholder "Buscar prenda") center; "Escribinos" WhatsApp button 44px high (wa bg, white text + icon) right.
- Body: left rail 220px (right border, padding 28×24, gap 28):
  - "CATEGORÍAS" caption (10px, tracking 2, muted); items 44px high, padding 0×12: label 15px (active: ink, medium, subtle bg, 2px ink left border; others muted) and count 12px muted on the right. Items: Novedades (all published), Vestidos, Tops, Faldas y shorts, Accesorios.
  - "TALLE" caption; chips in a 3-column grid, 40px high: XS S M / L XL U; active chip ink bg + white text, others surface + 1px line.
  - Note "Precios con IVA incluido. Consultas y reservas por WhatsApp." 12px muted.
- List (padding 24 32 0 32): header with title Cormorant 40/500 (category name), count line "113 prendas · talle S" 13px muted; sort control right (40px high, 1px line, "Más recientes" + chevron).
- Row (padding 14×0, gap 24, bottom 1px line, align center):
  - Photo 84×112 cover with hard sand offset 6×6; optional "NUEVO" tag.
  - Info (fill): brand eyebrow 10px tracking 1.5 muted; name Inter 18/500; detail line 13px muted (color/description); size chips 40×32 (available: 1px ink border; sold-out: subtle bg, muted, struck through — only when "mostrar talles agotados").
  - Price column 150px right-aligned: Cormorant 20/500 + "IVA incluido" 11px muted (or "Consultar precio").
  - WhatsApp square button 56×56 (wa bg, white icon).
- Detail sheet (tap a row): selected row gets subtle bg; scrim #141311 at 40%; sheet from the right 480px wide, full height, bg, padding 20 32 28 32, gap 20: close button 40×40 (1px line, X) top-right; photo 225×300 with sand offset 8 + vertical thumbnails 66×88 (selected 1.5px ink border); brand eyebrow; name Cormorant 32/500; price Cormorant 22 + "IVA incluido"; "TALLE" caption + size buttons 64×48 (selected ink bg/white, available surface + line, sold-out subtle + struck); description 13px muted; spacer; full-width WhatsApp button 56px "Consultar talle S por WhatsApp" (without size: "Consultar por WhatsApp").

## Portrait (640–1023px)

- Topbar padding 16×28: wordmark left; search icon button 44×44 + "Escribinos" right.
- Category tabs row (padding 0×28, gap 24, bottom border): 15px labels, active ink + 2px bottom border.
- Header (padding 24 28 8 28): title Cormorant 36/500 + count; sort right.
- Size chips row (padding 8 28 12 28): "Talle" label + chips 40px high (Todos, XS, S, M, L, XL, U).
- Rows (padding 0×28): photo 84×112 sand offset; info: brand eyebrow; name 17/500 and price Cormorant 19 on the same line (space-between); detail line; size chips + spacer + "Consultar" WhatsApp button 40px high.
- Detail sheet: same as landscape but full width up to 560px from the right (or bottom sheet) — keep the same content.

## Phone (< 640px)

- Same as portrait, tighter padding (20), photo 72×96, category tabs horizontally scrollable.
