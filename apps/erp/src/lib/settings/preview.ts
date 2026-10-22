import type { LotPricingMode } from "@atika/db";
import { priceLot } from "@atika/pricing";
import { parseAppSettings } from "./schema";

export interface PreviewProduct {
  id: string;
  name: string;
  originalValueUsd: number;
  /** Units bought across every size (not current stock). */
  unitsBought: number;
  priceGs: number;
}

export interface PreviewLot {
  id: string;
  name: string;
  /** Only `global` lots follow the Parámetros form; `custom` lots are never repriced by it. */
  pricingMode: LotPricingMode;
  totalShippingUsd: number;
  products: PreviewProduct[];
}

export interface PreviewRow {
  id: string;
  name: string;
  units: number;
  originalValueUsd: number;
  shippingPerUnitUsd: number;
  unitCostUsd: number;
  currentPriceGs: number;
  newPriceGs: number;
  differenceGs: number;
}

export type LotPreview =
  | { status: "invalid" }
  | { status: "empty" }
  | { status: "ok"; rows: PreviewRow[] };

/**
 * Prices one lot with the form values as typed (unsaved), exactly as saving would: same parsing
 * as the schema (percentages become fractions) and the lot's own shipping.
 */
export function previewLot(raw: Record<string, string>, lot: PreviewLot): LotPreview {
  const parsed = parseAppSettings(raw);
  if (!parsed.success) return { status: "invalid" };
  if (lot.products.reduce((sum, product) => sum + product.unitsBought, 0) === 0) {
    return { status: "empty" };
  }

  const priced = priceLot(
    { ...parsed.data, totalShippingUsd: lot.totalShippingUsd },
    lot.products.map((product) => ({
      id: product.id,
      originalValueUsd: product.originalValueUsd,
      units: product.unitsBought,
    })),
  );
  const rows = lot.products.flatMap((product, index) => {
    const result = priced[index];
    if (!result) return [];
    return {
      id: product.id,
      name: product.name,
      units: product.unitsBought,
      originalValueUsd: product.originalValueUsd,
      shippingPerUnitUsd: result.shippingPerUnitUsd,
      unitCostUsd: result.unitCostUsd,
      currentPriceGs: product.priceGs,
      newPriceGs: result.priceGs,
      differenceGs: result.priceGs - product.priceGs,
    };
  });
  return { status: "ok", rows };
}
