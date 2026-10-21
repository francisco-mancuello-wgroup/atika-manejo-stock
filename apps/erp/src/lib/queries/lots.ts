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
