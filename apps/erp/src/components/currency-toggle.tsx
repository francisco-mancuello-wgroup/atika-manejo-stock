import { cn } from "@atika/ui";
import type { Currency } from "../lib/currency";

const OPTIONS: { value: Currency; label: string }[] = [
  { value: "gs", label: "Gs" },
  { value: "usd", label: "US$" },
];

const NO_RATE_HINT = "Guardá el TC del día en Parámetros";

/** Pill that switches every amount between guaraníes and US dollars. */
export function CurrencyToggle({
  currency,
  canUseUsd,
  action,
}: {
  currency: Currency;
  /** US$ needs the exchange rate of the day. */
  canUseUsd: boolean;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action}>
      <fieldset className="inline-flex rounded-full border border-line bg-surface p-0.5">
        <legend className="sr-only">Moneda</legend>
        {OPTIONS.map(({ value, label }) => {
          const pressed = currency === value;
          const unavailable = value === "usd" && !canUseUsd;
          return (
            <button
              key={value}
              type="submit"
              name="currency"
              value={value}
              aria-pressed={pressed}
              disabled={unavailable}
              title={unavailable ? NO_RATE_HINT : undefined}
              className={cn(
                "rounded-full px-4 py-1 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                pressed ? "bg-ink text-surface" : "text-muted hover:text-ink",
                unavailable && "cursor-not-allowed opacity-50 hover:text-muted",
              )}
            >
              {label}
            </button>
          );
        })}
      </fieldset>
    </form>
  );
}
