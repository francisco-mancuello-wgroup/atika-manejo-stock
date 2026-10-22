import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { CURRENCY_COOKIE, type CurrencyDisplay, resolveCurrency } from "./currency";
import { getExchangeRateOrUndefined } from "./queries/settings";

/** Selected currency (cookie) with the exchange rate of the day, shared by the layout and the page of a request. */
export const getCurrencyDisplay = cache(async (): Promise<CurrencyDisplay> => {
  const [store, exchangeRate] = await Promise.all([cookies(), getExchangeRateOrUndefined()]);
  return {
    currency: resolveCurrency(store.get(CURRENCY_COOKIE)?.value, exchangeRate),
    exchangeRate,
  };
});
