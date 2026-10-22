import type { PromoGroup } from "@atika/pricing";
import type { CatalogSettingsView, ProductSource } from "./catalog-view";
import { type PieceColor, resolveColor } from "./colors";
import { type PriceFields, priceFields } from "./price";
import { sortSizes } from "./sizes";

/**
 * The three Atika lookbooks, in display order: each one is a vertical catalog like its PDF, a
 * cover and then one piece (or one set) per page. `value` is the Prisma `Catalog` enum value.
 */
export const CATALOGS = [
  {
    slug: "casa-icona",
    value: "casa_icona",
    name: "Casa Icona",
    tagline: "Colección seleccionada",
  },
  { slug: "milonga", value: "milonga", name: "Milonga", tagline: "Colección 2026" },
  { slug: "sordo", value: "sordo", name: "Sordo", tagline: "Aros y earcuffs" },
] as const;

export type CatalogSlug = (typeof CATALOGS)[number]["slug"];
export type CatalogValue = (typeof CATALOGS)[number]["value"];

/** `/catalogos/todos` chains the three catalogs. */
export const ALL_CATALOGS = "todos";

/** `/catalogos/pink`: the Pink selection, the pink pieces of every catalog. */
export const PINK_EVENT = "pink";

/** Pink's closing section: event pieces of a brand without its own catalog (Baobab, Zunilda). */
export const OTHER_BRANDS = {
  slug: "otras-marcas",
  name: "Otras marcas",
  tagline: "Selección Pink",
} as const;

export type PinkOnlySlug = CatalogSlug | typeof OTHER_BRANDS.slug;

export function findCatalog(slug: string) {
  return CATALOGS.find((catalog) => catalog.slug === slug) ?? null;
}

/** Catalogs with at least one piece to show: an empty one isn't offered on the web. */
export function withPieces<T extends { pages: readonly unknown[] }>(catalogs: readonly T[]): T[] {
  return catalogs.filter((catalog) => catalog.pages.length > 0);
}

/** What the lookbook reads of a product (the public columns plus its placement). */
export interface LookbookRow extends ProductSource {
  catalogName: string | null;
  catalog: CatalogValue | null;
  catalogOrder: number | null;
  catalogSection: string | null;
  /** Holds assigned stock in an active publication group: part of the Pink event. */
  inGroup: boolean;
  /** Event price from the active group (the event workbook's price); null keeps `priceGs`. */
  pinkPriceGs?: number | null;
}

/** One product on a page: a dress, or the top of a set. Nothing about costs or stock counts. */
export interface LookbookPiece extends PriceFields {
  id: string;
  name: string;
  /** Sizes that can be bought now, smallest first. */
  sizes: string[];
  color: PieceColor | null;
  description: string | null;
  /** In an active publication group: part of the Pink event. */
  inGroup: boolean;
  /** What Pink charges instead of the price above, or null when the event keeps it. */
  pinkPrice?: PriceFields | null;
  /** Bank promotions that cover this product today, grouped for display; none when absent. */
  bankPromos?: PromoGroup[];
}

/**
 * One garment on a page with the colors it comes in: the workbook keeps each color as its own
 * product (own stock and price), the shopper picks the color like in any fashion app.
 */
export interface LookbookItem {
  name: string;
  /** One product per color, in workbook order. */
  options: LookbookPiece[];
}

/** One page: usually one product, or the parts of a set that share a PDF page and its photo. */
export interface LookbookPage {
  /** Names of the garments on the page, joined with " + ". */
  title: string;
  brand: string | null;
  section: string | null;
  pieces: LookbookPiece[];
  /** The pieces grouped by name, so each garment shows once with its colors. */
  items: LookbookItem[];
  /** `pieceId` is the product the photo belongs to, so choosing a color can show its photo. */
  photos: { url: string; alt: string; pieceId: string }[];
  /** 1-based position in the catalog, after hiding pieces without stock or photos. */
  page: number;
}

const displayName = (row: LookbookRow) => row.catalogName?.trim() || row.name;

function byPdfOrder(a: LookbookRow, b: LookbookRow): number {
  const orderA = a.catalogOrder ?? Number.POSITIVE_INFINITY;
  const orderB = b.catalogOrder ?? Number.POSITIVE_INFINITY;
  if (orderA !== orderB) return orderA - orderB;
  // Parts of one set keep the workbook order (top before bottom)
  if (a.catalogOrder != null) return a.id.localeCompare(b.id);
  return displayName(a).localeCompare(displayName(b), "es");
}

function availableSizes(row: LookbookRow): string[] {
  return sortSizes(row.variants.filter((variant) => variant.stock > 0).map((v) => v.size));
}

function toPiece(
  row: LookbookRow,
  settings: Pick<CatalogSettingsView, "showPrices">,
): LookbookPiece {
  return {
    id: row.id,
    name: displayName(row),
    ...priceFields(row.priceGs, row.discountPercent, settings.showPrices),
    sizes: availableSizes(row),
    color: resolveColor(row.color, row.name),
    description: row.description?.trim() || null,
    inGroup: row.inGroup,
    // The event price is final: catalog discounts don't stack on it
    pinkPrice:
      row.pinkPriceGs == null ? null : priceFields(row.pinkPriceGs, null, settings.showPrices),
    bankPromos: row.bankPromos ?? [],
  };
}

function groupByName(pieces: LookbookPiece[]): LookbookItem[] {
  const items = new Map<string, LookbookItem>();
  for (const piece of pieces) {
    const item = items.get(piece.name);
    if (item) item.options.push(piece);
    else items.set(piece.name, { name: piece.name, options: [piece] });
  }
  return [...items.values()];
}

/** The pages of one catalog, in PDF order. A piece without stock or photos disappears. */
export function lookbookPages(
  rows: readonly LookbookRow[],
  settings: Pick<CatalogSettingsView, "showPrices">,
): LookbookPage[] {
  const shown = [...rows]
    .sort(byPdfOrder)
    .filter((row) => availableSizes(row).length > 0 && row.images.length > 0);

  const groups: LookbookRow[][] = [];
  for (const row of shown) {
    const last = groups.at(-1);
    const samePage =
      last !== undefined && row.catalogOrder != null && last[0]?.catalogOrder === row.catalogOrder;
    if (samePage) last.push(row);
    else groups.push([row]);
  }

  return groups.map((group, index) => {
    const seen = new Set<string>();
    const photos = group
      .flatMap((row) =>
        [...row.images]
          .sort((a, b) => a.position - b.position)
          .map((image) => ({ url: image.url, alt: displayName(row), pieceId: row.id })),
      )
      .filter((photo) => !seen.has(photo.url) && Boolean(seen.add(photo.url)));
    const first = group[0];
    const pieces = group.map((row) => toPiece(row, settings));
    const items = groupByName(pieces);
    return {
      title: items.map((item) => item.name).join(" + "),
      brand: first?.brand?.trim() || first?.lot.supplier.name.trim() || null,
      section: first?.catalogSection?.trim() || null,
      pieces,
      items,
      photos,
      page: index + 1,
    };
  });
}

/** Anchor of a page, unique when catalogs are chained (`milonga-pagina-3`). */
export function pageAnchor(slug: string, page: number): string {
  return `${slug}-pagina-${page}`;
}

/**
 * The pages with a piece in an active publication group (the Pink event), numbered again from 1,
 * each piece at its event price when the group sets one.
 */
export function pinkPages(pages: readonly LookbookPage[]): LookbookPage[] {
  return pages
    .filter((page) => page.pieces.some((piece) => piece.inGroup))
    .map((page, index) => {
      const pieces = page.pieces.map((piece) =>
        piece.pinkPrice ? { ...piece, ...piece.pinkPrice } : piece,
      );
      return { ...page, pieces, items: groupByName(pieces), page: index + 1 };
    });
}

const normalized = (text: string | null | undefined) => text?.trim().toLowerCase() ?? "";

/**
 * Where a Pink piece without a catalog shows on Pink: after the catalog of its brand (Milonga),
 * or under Otras marcas when its brand has none.
 */
export function pinkOnlySection(row: Pick<LookbookRow, "brand">): PinkOnlySlug {
  const brand = normalized(row.brand);
  return CATALOGS.find((catalog) => normalized(catalog.name) === brand)?.slug ?? OTHER_BRANDS.slug;
}

/** Whether any catalog has something for the Pink event: the home shows its banner only then. */
export function hasPinkPieces(catalogPages: readonly (readonly LookbookPage[])[]): boolean {
  return catalogPages.some((pages) => pinkPages(pages).length > 0);
}
