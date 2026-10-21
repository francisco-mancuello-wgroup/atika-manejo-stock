# Catalog presentation mode (reference: atika-event.vercel.app/catalogos/casa-icona)

Replicate the reference structure and behavior. Keep our tokens and fonts (Bodoni Moda display, Jost sans); reference values for comparison: bg #EFECEC, fg #252525, muted #252525BF, border #DCD8D6, surface #F5F3F2, button #2C332F with white text; headings Trirong 300, body Quattrocento Sans.

## Routes

- `/` — collections index: one card per collection (supplier lot) with cover photo, name and "N piezas", linking to `/catalogos/<slug>`; small link "Ver todo el catálogo" to `/ver-todo`.
- `/catalogos/[slug]` — presentation mode for one collection (slugs from supplier names: `casa-icona`, `milonga`, `zunilda-gutierrez`, `atika`). Unknown slug → 404. Only published products (honor hideOutOfStock).
- `/ver-todo` (+ `/ver-todo/[categoria]`) — the existing tablet rows list, moved here unchanged (filters, sheet, search keep working).
- `/producto/[id]` unchanged.

## Presentation page

- No site topbar. Fixed top bar over the content (height ~56): left "← CATÁLOGOS" link to `/` (11–12px, tracking ~2px, uppercase), right collection name uppercase same style.
- Scroll container: vertical `snap-y snap-mandatory`, each section `h-svh snap-start`.
- Section 0 (cover): centered wordmark + collection eyebrow (11px, tracking 3px, muted, uppercase); cover photo (first product photo) `object-contain`, max height ~60svh; H1 "Colección seleccionada" (display, light, 34px / 44px on lg); caption "N piezas · Deslizá para ver" (11px tracking 3px muted uppercase).
- Product sections (one per product, id `<slug>-pagina-<n>`, `aria-label` = product name):
  - Landscape ≥1024 (`landscape:lg`): grid `1.15fr 1fr`, photo column full height left, info panel right vertically centered with padding ~64px and gap 24.
  - Portrait / phone: photos fill the top (flex-1), info panel below with `max-h-[55svh]` scroll, padding 24 (40 on sm).
  - Photos: horizontal swipe carousel (`snap-x snap-mandatory`, one photo per slide, `object-contain` on surface bg); tapping a photo opens a full-screen zoom dialog (`<dialog>`, close button, Escape closes). Show small dots when more than one photo.
  - Info panel:
    - Row: "<Colección> · Colección seleccionada" (11px tracking 2.4px muted uppercase) left; "01 / 18" (display, light, 14px, muted) right.
    - Row: H2 name (display light 28 / 34 sm / 44 landscape-lg) left; price (sans 16 / 18 sm, tracking 1px, nowrap) right. When prices are hidden: "Consultar precio".
    - Description line (14px muted, hidden on phones): product description, or the Casa Icona look description.
    - Row: color (14px muted with a 16px swatch circle when a color is known) left; fieldset "TALLE" (legend 11px tracking 2.4px) with radio chips h-40 min-w-40 px-12, 1px border, selected = ink bg + white text; only sizes with stock (sold-out shown disabled/struck only when "mostrar talles agotados").
    - WhatsApp button (min-h 48, px 30, 15px, tracking 1px, dark button color, official WhatsApp icon): label "Elegí tu talle" while no size is selected (button disabled, focusing the size group on tap); after selection "Consultar talle S" → opens WhatsApp with the configured template filled (producto, talle) plus color, price and an absolute link to the piece anchor. Single-size products (e.g. U) are preselected.

## Behavior

- Server-rendered sections; only the size picker, carousel dots and zoom dialog are client components.
- Deep links `/catalogos/casa-icona#casa-icona-pagina-3` land on that piece.
- Catalog never exposes costs, stock counts, lots internals or sales.
