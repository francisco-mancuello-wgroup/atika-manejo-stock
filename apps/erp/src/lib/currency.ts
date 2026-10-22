/** Currency the ERP displays money in; amounts are stored in guaraníes. */
export type Currency = "gs" | "usd";

export const CURRENCY_COOKIE = "currency";

/** Anything that is not exactly `usd` is guaraníes (the default). */
export function parseCurrency(value: string | undefined): Currency {
  return value === "usd" ? "usd" : "gs";
}

/** US$ needs a saved exchange rate; without one the display stays in guaraníes. */
export function resolveCurrency(
  value: string | undefined,
  exchangeRate: number | undefined,
): Currency {
  return parseCurrency(value) === "usd" && exchangeRate !== undefined && exchangeRate > 0
    ? "usd"
    : "gs";
}

/** What a view needs to render money in the selected currency. */
export interface CurrencyDisplay {
  currency: Currency;
  exchangeRate?: number;
}
