import type { PromoGroup } from "@atika/pricing";
import { type PriceFields, priceFields } from "./price";
import { sortSizes } from "./sizes";

export interface CatalogSettingsView {
  whatsappNumber: string;
  messageTemplate: string;
  heroText: string;
  showPrices: boolean;
  showSoldOutSizes: boolean;
  hideOutOfStock: boolean;
}

/** The bank account shoppers pay into by transfer (loaded in the ERP). */
export interface PaymentDetailsView {
  holderName: string;
  bank: string;
  accountGs: string;
  accountUsd: string;
  ruc: string;
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
export interface CatalogProduct extends PriceFields {
  id: string;
  name: string;
  /** Brand display name (product brand, else the supplier's name); never a cost or lot detail. */
  brand: string | null;
  category: string | null;
  sizes: CatalogSize[];
  /** At least one size is available. */
  inStock: boolean;
  /** URL of the cover photo. */
  imageUrl: string | null;
  /** One line under the name: color and the start of the description. */
  detail: string | null;
}

/** Everything the detail sheet shows. Still nothing about costs, lots or stock counts. */
export interface CatalogProductDetail extends CatalogProduct {
  color: string | null;
  description: string | null;
  /** Photos in display order, named after the product (the ERP alt text is not published). */
  images: { url: string; alt: string }[];
  /** Bank promotions that cover this product today, grouped for display; none when absent. */
  bankPromos?: PromoGroup[];
}

export interface ProductSource {
  id: string;
  name: string;
  brand: string | null;
  lot: { supplier: { name: string } };
  category: string | null;
  priceGs: number;
  /** Percent off that applies now (computed on the server from the active discounts). */
  discountPercent?: number | null;
  variants: readonly { size: string; stock: number }[];
  images: readonly { url: string; position: number }[];
  color?: string | null;
  description?: string | null;
  /** Bank promotions covering the product now (computed on the server from the live promos). */
  bankPromos?: PromoGroup[];
}

const DETAIL_MAX_LENGTH = 140;

function clean(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function detailLine(color: string | null, description: string | null): string | null {
  const line = [color, description].filter(Boolean).join(" · ");
  if (!line) return null;
  return line.length > DETAIL_MAX_LENGTH
    ? `${line.slice(0, DETAIL_MAX_LENGTH - 1).trimEnd()}…`
    : line;
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
    ...priceFields(product.priceGs, product.discountPercent, settings.showPrices),
    sizes: settings.showSoldOutSizes ? sizes : available,
    inStock: available.length > 0,
    imageUrl: cover?.url ?? null,
    detail: detailLine(clean(product.color), clean(product.description)),
  };
}

export function toCatalogProductDetail(
  product: ProductSource,
  settings: Pick<CatalogSettingsView, "showPrices" | "showSoldOutSizes">,
): CatalogProductDetail {
  return {
    ...toCatalogProduct(product, settings),
    color: clean(product.color),
    description: clean(product.description),
    images: [...product.images]
      .sort((a, b) => a.position - b.position)
      .map((image) => ({ url: image.url, alt: product.name })),
    bankPromos: product.bankPromos ?? [],
  };
}
