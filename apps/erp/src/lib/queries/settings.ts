import "server-only";
import { getDb } from "../db";

export interface AppSettingsView {
  exchangeRate: number;
  saleFactor: number;
  vatPercent: number;
  costPercent: number;
}

/** Used until the settings row exists (the seed creates it). */
export const DEFAULT_APP_SETTINGS: AppSettingsView = {
  exchangeRate: 7400,
  saleFactor: 2.5,
  vatPercent: 10,
  costPercent: 100,
};

const toPercent = (fraction: number) => Math.round(fraction * 100 * 10_000) / 10_000;

export async function getAppSettings(): Promise<AppSettingsView> {
  const row = await getDb().appSettings.findUnique({ where: { id: 1 } });
  if (!row) return DEFAULT_APP_SETTINGS;
  return {
    exchangeRate: row.exchangeRate.toNumber(),
    saleFactor: row.saleFactor.toNumber(),
    vatPercent: toPercent(row.vatRate.toNumber()),
    costPercent: toPercent(row.costRate.toNumber()),
  };
}

/** Exchange rate for the sidebar; the layout must not fail when the database is unreachable. */
export async function getExchangeRateOrUndefined(): Promise<number | undefined> {
  try {
    return (await getAppSettings()).exchangeRate;
  } catch (error) {
    console.error("could not read the exchange rate of the day", error);
    return undefined;
  }
}
