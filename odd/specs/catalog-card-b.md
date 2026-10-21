# B · Catálogo · Inicio — card and home spec (read from atika.pen, node GUFPn)

## Desktop (1440 wide)
- Grid: padding [0, 64, 64, 64]; rows gap 40; 4 columns, column gap 24 (content width 1312 → card ~310 wide).
- Card: vertical, gap 12.
  - Photo: full card width, height 416 (≈ 3:4), image cover, square corners, NO inner padding block.
    - Sand offset: hard outer shadow color #D8C9B0 (sand), offset x 10, y 10, no blur (behind the photo, bottom-right).
    - Optional tag "NUEVO" top-left inside photo, padding 12 from edges: bg #FFFFFFE6, padding 4×8, Inter 11 / 500 / letter-spacing 1.4, ink.
  - Text block: vertical, gap 4.
    - Brand/lot eyebrow: Inter 11, normal, letter-spacing 1, muted #6A645B (e.g. "Casa Icona").
    - Line: name (Inter 15 / 500, ink) left and price (Inter 15 / normal, ink) right, space-between, same line.
    - Sizes: "Talles: XS · S · L" Inter 12, muted.
- Name is Inter (not Cormorant) on cards.
- Intro: padding [56, 64, 40, 64], space-between, align end.
  - Left (width 640, gap 12): eyebrow "Novedades" Inter 13 / 500 / ls 1.5 muted (uppercase look); headline Cormorant Garamond 57 / 500 / line-height 1.05 ink.
  - Right: note "Precios con IVA incluido · Consultas y reservas por WhatsApp" Inter 13 muted.
- Filters row: padding [0, 64, 28, 64], space-between: left "Talle" label (Inter 13 muted) + size chips (gap 8; active chip ink bg / white text; others 1px line border), right "Más recientes" + chevron (Inter 13 ink).
- Footer: padding [28, 64], top border line, "átika · Asunción, Paraguay" left, contact right, Inter 13 muted.

## Mobile (390 wide)
- Grid padding [0, 20]; rows gap 24; 2 columns gap 12.
- Card gap 8; photo height 224, cover, sand offset 6×6.
- Text: name Inter 13 / 500; price Inter 13 normal (own line); sizes Inter 11 muted.

## Placeholder (no photo)
- Same photo box and sand offset; fill subtle (#EBE6DD) with nothing inside (no smaller inner box).
