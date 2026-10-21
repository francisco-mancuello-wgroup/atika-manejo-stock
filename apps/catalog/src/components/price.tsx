import { cn } from "@atika/ui";
import { formatGs } from "../lib/format";
import { discountLabel, type PriceFields } from "../lib/price";

/**
 * The price text of any price display, to put inside the caller's own element: "Consultar
 * precio" when prices are hidden, the list price alone, or, with a discount, the list price
 * struck through next to the "-N %" badge and, below, the discounted price.
 */
export function Price({
  priceGs,
  discountPercent,
  discountedPriceGs,
  align = "end",
}: PriceFields & { align?: "start" | "end" }) {
  if (priceGs === null) return <>Consultar precio</>;
  if (discountPercent === null || discountedPriceGs === null) return <>{formatGs(priceGs)}</>;
  return (
    <span
      className={cn(
        "inline-flex flex-col gap-0.5 leading-tight",
        align === "end" ? "items-end" : "items-start",
      )}
    >
      <span className="flex items-center gap-2 text-[0.65em] font-normal tracking-normal">
        <s className="whitespace-nowrap text-muted">{formatGs(priceGs)}</s>
        <span className="whitespace-nowrap bg-ink px-1.5 py-0.5 text-surface">
          {discountLabel(discountPercent)}
        </span>
      </span>
      <span className="whitespace-nowrap">{formatGs(discountedPriceGs)}</span>
    </span>
  );
}
