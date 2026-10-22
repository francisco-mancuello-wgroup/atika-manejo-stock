import { asuncionDay } from "./discount";

export type BankPromoKind = "installments" | "refund" | "discount";
export type BankPromoScope = "all" | "lots" | "products";

export interface PromoBank {
  id: string;
  name: string;
  /** Public URL of the logo; null when the bank has none (the name is shown instead). */
  logoUrl: string | null;
}

/** A bank promotion as the catalog and the ERP read it. Informational: it never changes prices. */
export interface BankPromoRule {
  kind: BankPromoKind;
  /** Installments: integer 2-48. Refund and discount: integer percent 1-100. */
  value: number;
  /** ISO weekdays the promo applies (1 = Monday ... 7 = Sunday); empty = every day. */
  days: readonly number[];
  /** Maximum benefit in Gs; null = no cap. */
  capGs: number | null;
  /** First day of the window (date-only, stored as UTC midnight); null = no start. */
  startsAt: Date | null;
  /** Last day of the window, inclusive; null = no end. */
  endsAt: Date | null;
  terms: string | null;
  isActive: boolean;
  scope: BankPromoScope;
  /** Only read when scope is "lots". */
  lotIds: readonly string[];
  /** Only read when scope is "products". */
  productIds: readonly string[];
  banks: readonly PromoBank[];
}

export interface PromoGroup {
  headline: string;
  kind: BankPromoKind;
  /** Banks of every promo sharing the headline, deduplicated and ordered by name. */
  banks: PromoBank[];
}

const DAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const KIND_ORDER: Record<BankPromoKind, number> = { installments: 0, refund: 1, discount: 2 };

/** ISO weekday (1 = Monday ... 7 = Sunday) of an Asunción calendar day (`yyyy-mm-dd`). */
function isoWeekday(day: string): number {
  const weekday = new Date(`${day}T00:00:00.000Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

/**
 * True when the promo is active, today (Asunción calendar day) lies inside its window, start and
 * end days inclusive, and today's weekday is one of its days (no days = every day).
 */
export function isPromoLive(promo: BankPromoRule, now: Date): boolean {
  if (!promo.isActive) return false;
  const today = asuncionDay(now);
  if (promo.startsAt && today < promo.startsAt.toISOString().slice(0, 10)) return false;
  if (promo.endsAt && today > promo.endsAt.toISOString().slice(0, 10)) return false;
  return promo.days.length === 0 || promo.days.includes(isoWeekday(today));
}

/** Live promos whose scope covers the product (all, its lot, or the product itself). */
export function promosForProduct<T extends BankPromoRule>(
  promos: readonly T[],
  target: { productId: string; lotId: string },
  now: Date,
): T[] {
  return promos.filter((promo) => {
    if (!isPromoLive(promo, now)) return false;
    if (promo.scope === "lots") return promo.lotIds.includes(target.lotId);
    if (promo.scope === "products") return promo.productIds.includes(target.productId);
    return true;
  });
}

function formatGs(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** "Lunes y jueves": ordered Monday to Sunday, only the first name capitalized. Empty for every day. */
function daysLabel(days: readonly number[]): string {
  const unique = [...new Set(days)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  if (unique.length === 0 || unique.length === 7) return "";
  const names = unique.map((d) => DAY_NAMES[d - 1] as string);
  const joined =
    names.length === 1
      ? (names[0] as string)
      : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

/** "Hasta 12 cuotas sin intereses", "20 % de reintegro · Jueves · Tope ₲ 200.000". */
export function promoHeadline(promo: BankPromoRule): string {
  const benefit =
    promo.kind === "installments"
      ? `Hasta ${promo.value} cuotas sin intereses`
      : `${promo.value} % de ${promo.kind === "refund" ? "reintegro" : "descuento"}`;
  const parts = [benefit];
  const days = daysLabel(promo.days);
  if (days) parts.push(days);
  if (promo.capGs !== null) parts.push(`Tope ₲ ${formatGs(promo.capGs)}`);
  return parts.join(" · ");
}

/**
 * Groups promos by headline merging their banks, ordered installments (highest first), then
 * refunds, then discounts (each highest first).
 */
export function groupPromosForDisplay(promos: readonly BankPromoRule[]): PromoGroup[] {
  const groups = new Map<string, PromoGroup & { value: number }>();
  for (const promo of promos) {
    const headline = promoHeadline(promo);
    const group = groups.get(headline) ?? {
      headline,
      kind: promo.kind,
      value: promo.value,
      banks: [],
    };
    for (const bank of promo.banks) {
      if (!group.banks.some((b) => b.id === bank.id)) group.banks.push(bank);
    }
    groups.set(headline, group);
  }
  return [...groups.values()]
    .sort(
      (a, b) =>
        KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
        b.value - a.value ||
        a.headline.localeCompare(b.headline, "es"),
    )
    .map(({ headline, kind, banks }) => ({
      headline,
      kind,
      banks: banks.sort((a, b) => a.name.localeCompare(b.name, "es")),
    }));
}
