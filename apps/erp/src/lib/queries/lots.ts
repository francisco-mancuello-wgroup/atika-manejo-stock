import "server-only";
import { getDb } from "../db";
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

export interface SettingsLot {
  id: string;
  name: string;
  productCount: number;
}

/** Lots a parameters change can be applied to, newest first. */
export async function getLotsForSettings(): Promise<SettingsLot[]> {
  const lots = await getDb().lot.findMany({
    orderBy: { purchasedAt: "desc" },
    select: { id: true, name: true, _count: { select: { products: true } } },
  });
  return lots.map((lot) => ({ id: lot.id, name: lot.name, productCount: lot._count.products }));
}
