import { sortSizes } from "./sizes";

export interface CatalogSettingsView {
  whatsappNumber: string;
  messageTemplate: string;
  heroText: string;
  showPrices: boolean;
  showSoldOutSizes: boolean;
  hideOutOfStock: boolean;
}

/** What the public site may know about a size: whether it can be bought, never how many. */
export interface CatalogSize {
  size: string;
  available: boolean;
}

/**
 * The only product shape that reaches the public pages. It is built field by field, so cost,
 * original value, lot, stock counts and sales can never leak through it. The only
 * lot-derived data is `brand`, a display name that is already public on the garments.
 */
export interface CatalogProduct {
  id: string;
  name: string;
  /** Brand display name (product brand, else the supplier's name); never a cost or lot detail. */
  brand: string | null;
  category: string | null;
  /** Null when the store hides prices ("Consultar precio"). */
  priceGs: number | null;
  sizes: CatalogSize[];
  /** At least one size is available. */
  inStock: boolean;
  /** URL of the cover photo; the only thing the public site learns about product images. */
  imageUrl: string | null;
}

export interface ProductSource {
  id: string;
  name: string;
  brand: string | null;
  lot: { supplier: { name: string } };
  category: string | null;
  priceGs: number;
  variants: readonly { size: string; stock: number }[];
  images: readonly { url: string; position: number }[];
}

export function toCatalogProduct(
  product: ProductSource,
  settings: Pick<CatalogSettingsView, "showPrices" | "showSoldOutSizes">,
): CatalogProduct {
  const order = sortSizes(product.variants.map((variant) => variant.size));
  const sizes = [...product.variants]
    .sort((a, b) => order.indexOf(a.size) - order.indexOf(b.size))
    .map((variant) => ({ size: variant.size, available: variant.stock > 0 }));
  const available = sizes.filter((size) => size.available);
  const cover = [...product.images].sort((a, b) => a.position - b.position)[0];
  return {
    id: product.id,
    name: product.name,
    brand: product.brand?.trim() || product.lot.supplier.name.trim() || null,
    category: product.category,
    priceGs: settings.showPrices ? product.priceGs : null,
    sizes: settings.showSoldOutSizes ? sizes : available,
    inStock: available.length > 0,
    imageUrl: cover?.url ?? null,
  };
}
