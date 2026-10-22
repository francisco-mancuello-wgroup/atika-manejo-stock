import { roundGs } from "./index";

/** A discount as the catalog and the ERP read it, with its explicit product list. */
export interface DiscountRule {
  /** Integer percent taken off the price. */
  percent: number;
  isActive: boolean;
  /** First day of the window (date-only, stored as UTC midnight); null = no start. */
  startsAt: Date | null;
  /** Last day of the window, inclusive; null = no end. */
  endsAt: Date | null;
  scope: "all" | "selected";
  /** Only read when scope is "selected". */
  productIds: readonly string[];
}

const TIME_ZONE = "America/Asuncion";

/** `yyyy-mm-dd` of the Asunción calendar day that contains `now` (en-CA formats it that way). */
export function asuncionDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Price after taking `percent` off, rounded to the nearest 1.000 Gs like every other price. */
export function applyDiscount(priceGs: number, percent: number): number {
  if (!Number.isFinite(priceGs) || priceGs < 0) {
    throw new RangeError(`priceGs must be a non-negative number, got ${priceGs}`);
  }
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new RangeError(`percent must be between 0 and 100, got ${percent}`);
  }
  return roundGs((priceGs * (100 - percent)) / 100);
}

function isInWindow(rule: DiscountRule, today: string): boolean {
  if (rule.startsAt && today < rule.startsAt.toISOString().slice(0, 10)) return false;
  if (rule.endsAt && today > rule.endsAt.toISOString().slice(0, 10)) return false;
  return true;
}

/**
 * The percent that applies to a product right now: the highest among active discounts whose
 * window contains today (start and end days inclusive, judged on the Asunción calendar) and
 * whose scope covers the product. Discounts never stack. Null when none applies.
 */
export function effectiveDiscount(
  discounts: readonly DiscountRule[],
  productId: string,
  now: Date,
): number | null {
  const today = asuncionDay(now);
  let best: number | null = null;
  for (const rule of discounts) {
    if (!rule.isActive || !isInWindow(rule, today)) continue;
    if (rule.scope === "selected" && !rule.productIds.includes(productId)) continue;
    if (best === null || rule.percent > best) best = rule.percent;
  }
  return best;
}
