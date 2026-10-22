import "server-only";
import { getDb } from "../db";
import type { PreviewLot } from "../settings/preview";
import { type LotDetail, type LotSummary, toLotDetail, toLotSummary } from "../view-models";

const lotInclude = {
  supplier: { select: { name: true } },
  products: {
    orderBy: { name: "asc" },
    include: { variants: true },
  },
} as const;

export async function getLotSummaries(): Promise<LotSummary[]> {
  const lots = await getDb().lot.findMany({
    orderBy: { purchasedAt: "desc" },
    include: lotInclude,
  });
  return lots.map(toLotSummary);
}

export async function getLotDetail(lotId: string): Promise<LotDetail | null> {
  const lot = await getDb().lot.findUnique({ where: { id: lotId }, include: lotInclude });
  return lot ? toLotDetail(lot) : null;
}

/** Every lot with what the settings preview needs to reprice it, newest first. */
export async function getLotsForPricingPreview(): Promise<PreviewLot[]> {
  const lots = await getDb().lot.findMany({
    orderBy: { purchasedAt: "desc" },
    select: {
      id: true,
      name: true,
      pricingMode: true,
      totalShippingUsd: true,
      products: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          originalValueUsd: true,
          priceGs: true,
          variants: { select: { unitsBought: true } },
        },
      },
    },
  });
  return lots.map((lot) => ({
    id: lot.id,
    name: lot.name,
    pricingMode: lot.pricingMode,
    totalShippingUsd: lot.totalShippingUsd.toNumber(),
    products: lot.products.map((product) => ({
      id: product.id,
      name: product.name,
      originalValueUsd: product.originalValueUsd.toNumber(),
      unitsBought: product.variants.reduce((sum, variant) => sum + variant.unitsBought, 0),
      priceGs: product.priceGs,
    })),
  }));
}
