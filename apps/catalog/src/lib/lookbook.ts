import type { PromoGroup } from "@atika/pricing";
import type { StaticImageData } from "next/image";
import type { CatalogSettingsView, ProductSource } from "./catalog-view";
import { type PieceColor, resolveColor } from "./colors";
import { type Focus, focusOf } from "./focus";
import { type PriceFields, priceFields } from "./price";
import { sortSizes } from "./sizes";

/** `/catalogos/todos` chains every active brand's lookbook. */
export const ALL_CATALOGS = "todos";

/** `/catalogos/pink`: the Pink selection, the pink pieces of every brand. */
export const PINK_EVENT = "pink";

/** Cover of a lookbook: a static photo (the original three), or the URL of an uploaded/product photo. */
export type BookCover = StaticImageData | string;

/**
 * Cover of a brand's lookbook: the one uploaded in the ERP, else the static cover of the original
 * three catalogs (Casa Icona, Milonga, Sordo), else the first photo of its first page.
 */
export function brandCover(
  coverUrl: string | null | undefined,
  staticCover: StaticImageData | undefined,
  pages: readonly LookbookPage[],
): BookCover | null {
  return coverUrl?.trim() || staticCover || pages[0]?.photos[0]?.url || null;
}

const TAGLINES: Record<string, string> = {
  "casa-icona": "Colección seleccionada",
  milonga: "Colección 2026",
  sordo: "Aros y earcuffs",
  "otras-marcas": "Más marcas",
};

/** The line under a brand's name on its cover. */
export function brandTagline(slug: string): string {
  return TAGLINES[slug] ?? "Colección seleccionada";
}

/** Brands with at least one piece to show: an empty one isn't offered on the web. */
export function withPieces<T extends { pages: readonly unknown[] }>(catalogs: readonly T[]): T[] {
  return catalogs.filter((catalog) => catalog.pages.length > 0);
}

/** What the lookbook reads of a product (the public columns plus its placement). */
export interface LookbookRow extends ProductSource {
  /** Legacy hand-set catalog: only keeps pieces of different old catalogs off the same page. */
  catalog: string | null;
  catalogOrder: number | null;
  catalogSection: string | null;
  createdAt: Date;
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
  photos: (Focus & { url: string; alt: string; pieceId: string })[];
  /** 1-based position in the catalog, after hiding pieces without stock or photos. */
  page: number;
}

// The web shows the ERP product name, so a rename in the ERP reaches the lookbook.
const displayName = (row: LookbookRow) => row.name;

/**
 * Inside a brand: the pieces with a PDF page first, in page order (parts of a set keep the
 * workbook order), then the pieces without one, newest first.
 */
function byPdfOrder(a: LookbookRow, b: LookbookRow): number {
  const orderA = a.catalogOrder ?? Number.POSITIVE_INFINITY;
  const orderB = b.catalogOrder ?? Number.POSITIVE_INFINITY;
  if (orderA !== orderB) return orderA - orderB;
  if (a.catalogOrder == null) {
    return b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id);
  }
  return (a.catalog ?? "").localeCompare(b.catalog ?? "") || a.id.localeCompare(b.id);
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

/** The pages of one brand, in PDF order. A piece without stock or photos disappears. */
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
    // One page per (old catalog, page number): numbers from different old catalogs never merge
    const samePage =
      last !== undefined &&
      row.catalogOrder != null &&
      last[0]?.catalogOrder === row.catalogOrder &&
      last[0]?.catalog === row.catalog;
    if (samePage) last.push(row);
    else groups.push([row]);
  }

  return groups.map((group, index) => {
    const seen = new Set<string>();
    const photos = group
      .flatMap((row) =>
        [...row.images]
          .sort((a, b) => a.position - b.position)
          .map((image) => ({
            url: image.url,
            alt: displayName(row),
            pieceId: row.id,
            ...focusOf(image),
          })),
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

/** Whether any brand has something for the Pink event: the home shows its banner only then. */
export function hasPinkPieces(catalogPages: readonly (readonly LookbookPage[])[]): boolean {
  return catalogPages.some((pages) => pinkPages(pages).length > 0);
}
