import {
  type CatalogSettingsView,
  type CatalogSize,
  type ProductSource,
  toCatalogProduct,
} from "./catalog-view";
import { type PieceColor, resolveColor } from "./colors";
import { type Focus, focusOf } from "./focus";
import { findLookDescription, LOOKS, LOOKS_SUPPLIER, type Look } from "./looks";
import type { PriceFields } from "./price";

/**
 * One piece of a presentation page, built field by field like the other catalog view models, so
 * costs, lots, stock counts and sales can never leak through it.
 */
export interface PresentationPiece extends PriceFields {
  id: string;
  name: string;
  sizes: CatalogSize[];
  /** Photos in display order, named after the product. */
  photos: (Focus & { url: string; alt: string })[];
  color: PieceColor | null;
  description: string | null;
}

/** A supplier lot shown as a collection. */
export interface CollectionSummary {
  slug: string;
  name: string;
  /** Published pieces (honoring "hide out of stock"). */
  count: number;
  coverUrl: string | null;
}

export interface PresentationCollection {
  slug: string;
  name: string;
  pieces: PresentationPiece[];
}

/** URL slug of a supplier name: `Átika` becomes `atika`, `Casa Icona` becomes `casa-icona`. */
export function collectionSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toPresentationPiece(
  product: ProductSource,
  settings: Pick<CatalogSettingsView, "showPrices" | "showSoldOutSizes">,
  looks: readonly Look[] = LOOKS,
): PresentationPiece {
  const base = toCatalogProduct(product, settings);
  const stored = product.description?.trim();
  const fromLook =
    product.lot.supplier.name.trim() === LOOKS_SUPPLIER
      ? findLookDescription(looks, product.name)
      : null;
  return {
    id: product.id,
    name: product.name,
    priceGs: base.priceGs,
    discountPercent: base.discountPercent,
    discountedPriceGs: base.discountedPriceGs,
    sizes: base.sizes,
    photos: [...product.images]
      .sort((a, b) => a.position - b.position)
      .map((image) => ({ url: image.url, alt: product.name, ...focusOf(image) })),
    color: resolveColor(product.color, product.name),
    description: stored || fromLook,
  };
}
