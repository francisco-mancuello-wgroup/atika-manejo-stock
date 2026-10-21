import { applyDiscount } from "@atika/pricing";
import { formatGs } from "./format";

/**
 * The price fields every catalog view model carries. Only the percent and the discounted price
 * are public; the discount's name, scope and window never leave the server.
 */
export interface PriceFields {
  /** List price. Null when the store hides prices ("Consultar precio"). */
  priceGs: number | null;
  /** Percent off right now, or null (no discount, or prices hidden). */
  discountPercent: number | null;
  /** Price after the discount, or null when there is none. */
  discountedPriceGs: number | null;
}

export function priceFields(
  priceGs: number,
  discountPercent: number | null | undefined,
  showPrices: boolean,
): PriceFields {
  if (!showPrices) return { priceGs: null, discountPercent: null, discountedPriceGs: null };
  if (discountPercent == null) {
    return { priceGs, discountPercent: null, discountedPriceGs: null };
  }
  return { priceGs, discountPercent, discountedPriceGs: applyDiscount(priceGs, discountPercent) };
}

/** What the customer pays: the discounted price when there is one, else the list price. */
export function effectivePriceGs(fields: PriceFields): number | null {
  return fields.discountedPriceGs ?? fields.priceGs;
}

/** Badge text: `-20 %`. */
export function discountLabel(percent: number): string {
  return `-${percent} %`;
}

/** Price text for WhatsApp messages of a discounted piece (`₲ 360.000 (-20 %)`), else null. */
export function discountedPriceLabel(fields: PriceFields): string | null {
  if (fields.discountPercent === null || fields.discountedPriceGs === null) return null;
  return `${formatGs(fields.discountedPriceGs)} (${discountLabel(fields.discountPercent)})`;
}
