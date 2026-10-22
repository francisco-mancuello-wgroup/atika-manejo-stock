import type { Currency } from "./currency";

const INTEGER = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 });
const DECIMAL_2 = new Intl.NumberFormat("es-PY", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatInteger(value: number): string {
  return INTEGER.format(value);
}

/** Guaraníes: `₲ 2.518.000`. */
export function formatGs(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}₲\u00a0${INTEGER.format(Math.abs(rounded))}`;
}

/** US dollars: `US$ 123,74` (non-breaking space so tables never split symbol and amount). */
export function formatUsd(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}US$\u00a0${DECIMAL_2.format(Math.abs(value))}`;
}

/** `1 lote`, `3 lotes`: the singular only for exactly one. */
export function countOf(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** ISO `yyyy-mm-dd` to `dd/mm/yyyy`. */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/** Guaraní amount in the selected currency; dollars use the exchange rate, falling back to guaraníes without one. */
export function formatMoney(
  amountGs: number,
  currency: Currency,
  exchangeRate: number | undefined,
): string {
  if (currency === "usd" && exchangeRate !== undefined && exchangeRate > 0) {
    return formatUsd(amountGs / exchangeRate);
  }
  return formatGs(amountGs);
}

export function moneyFormatter(
  currency: Currency,
  exchangeRate: number | undefined,
): (amountGs: number) => string {
  return (amountGs) => formatMoney(amountGs, currency, exchangeRate);
}
