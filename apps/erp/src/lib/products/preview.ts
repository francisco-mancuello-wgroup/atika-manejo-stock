import { type LotPricingParams, priceGs, shippingPerUnit, unitCostUsd } from "@atika/pricing";

export interface PreviewInput {
  params: LotPricingParams;
  /** Units bought by the other products of the lot. */
  otherUnits: number;
  /** Units bought of this product, as typed in the form. */
  units: number;
  originalValueUsd: number;
}

/**
 * Live "Costo u. (US$)" and "Precio (₲)" with the lot formula (`@atika/pricing`). Shipping is
 * prorated over the lot's units including this product's. Null while the inputs cannot be priced.
 */
export function previewPrice(input: PreviewInput): { unitCostUsd: number; priceGs: number } | null {
  const { params, otherUnits, units, originalValueUsd } = input;
  const total = otherUnits + units;
  if (!Number.isInteger(total) || total <= 0) return null;
  if (!Number.isFinite(originalValueUsd) || originalValueUsd < 0) return null;
  const cost = unitCostUsd(
    originalValueUsd,
    params.costRate,
    shippingPerUnit(params.totalShippingUsd, total),
  );
  return { unitCostUsd: cost, priceGs: priceGs(cost, params) };
}
