import type { Prisma } from "@atika/db";
import { type LotPricingParams, priceLot } from "@atika/pricing";

export interface RecalcProduct {
  id: string;
  originalValueUsd: number;
  variants: { unitsBought: number }[];
}

/** New list price per product. Shipping is prorated over the units bought by the whole lot. */
export function computeLotPrices(
  params: LotPricingParams,
  products: readonly RecalcProduct[],
): { id: string; priceGs: number }[] {
  const models = products.map((product) => ({
    id: product.id,
    originalValueUsd: product.originalValueUsd,
    units: product.variants.reduce((sum, variant) => sum + variant.unitsBought, 0),
  }));
  if (models.reduce((sum, model) => sum + model.units, 0) === 0) return [];
  return priceLot(params, models).map(({ id, priceGs }) => ({ id, priceGs }));
}

export type RecalculateResult =
  | { ok: true; updatedProducts: number }
  | { ok: false; reason: "lot_not_found" };

/**
 * Saves the lot parameters and reprices every product of the lot. Run it inside a transaction:
 * the caller owns atomicity.
 */
export async function recalculateLot(
  tx: Prisma.TransactionClient,
  lotId: string,
  params: LotPricingParams,
): Promise<RecalculateResult> {
  const lot = await tx.lot.findUnique({
    where: { id: lotId },
    select: { id: true, products: { include: { variants: true } } },
  });
  if (!lot) return { ok: false, reason: "lot_not_found" };

  await tx.lot.update({
    where: { id: lotId },
    data: {
      exchangeRate: params.exchangeRate,
      saleFactor: params.saleFactor,
      vatRate: params.vatRate,
      costRate: params.costRate,
      totalShippingUsd: params.totalShippingUsd,
    },
  });

  const prices = computeLotPrices(
    params,
    lot.products.map((product) => ({
      id: product.id,
      originalValueUsd: product.originalValueUsd.toNumber(),
      variants: product.variants,
    })),
  );
  for (const { id, priceGs } of prices) {
    await tx.product.update({ where: { id }, data: { priceGs } });
  }
  return { ok: true, updatedProducts: prices.length };
}
