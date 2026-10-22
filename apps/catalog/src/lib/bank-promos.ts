import { type BankPromoRule, type PromoBank, promoHeadline } from "@atika/pricing";

/**
 * A live promo as the public terms page shows it. Built field by field: which lots or products a
 * promo covers never leaves the server, only whether it applies to everything.
 */
export interface PublicBankPromo {
  id: string;
  headline: string;
  kind: BankPromoRule["kind"];
  banks: PromoBank[];
  /** `yyyy-mm-dd`, or null when the window has no start. */
  startsAt: string | null;
  endsAt: string | null;
  terms: string | null;
  appliesTo: "all" | "selected";
}

const isoDay = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

export function toPublicPromo(promo: BankPromoRule & { id: string }): PublicBankPromo {
  return {
    id: promo.id,
    headline: promoHeadline(promo),
    kind: promo.kind,
    banks: [...promo.banks]
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
      .map((bank) => ({ id: bank.id, name: bank.name, logoUrl: bank.logoUrl })),
    startsAt: isoDay(promo.startsAt),
    endsAt: isoDay(promo.endsAt),
    terms: promo.terms,
    appliesTo: promo.scope === "all" ? "all" : "selected",
  };
}

/** `yyyy-mm-dd` as `dd/mm/yyyy`. */
function formatDay(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/** Validity as the terms page words it (both ends inclusive). */
export function formatPromoWindow(startsAt: string | null, endsAt: string | null): string {
  if (startsAt && endsAt) {
    return startsAt === endsAt
      ? `El ${formatDay(startsAt)}`
      : `Del ${formatDay(startsAt)} al ${formatDay(endsAt)}`;
  }
  if (startsAt) return `Desde el ${formatDay(startsAt)}`;
  if (endsAt) return `Hasta el ${formatDay(endsAt)}`;
  return "Sin fecha de vencimiento";
}
