import "server-only";
import { monthStartIso, toDbDate, todayIso } from "../dates";
import { type LotSummary, type SaleRow, type SummaryTotals, summarizeLots } from "../view-models";
import { getLotSummaries } from "./lots";
import { getLatestSales, getMonthSalesTotalGs } from "./sales";

export interface ResumenData {
  totals: SummaryTotals;
  monthSalesGs: number;
  lots: LotSummary[];
  latestSales: SaleRow[];
}

export async function getResumen(): Promise<ResumenData> {
  const [lots, latestSales, monthSalesGs] = await Promise.all([
    getLotSummaries(),
    getLatestSales(5),
    getMonthSalesTotalGs(toDbDate(monthStartIso(todayIso()))),
  ]);
  return { totals: summarizeLots(lots), monthSalesGs, lots, latestSales };
}
