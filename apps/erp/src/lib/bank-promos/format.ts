export type PromoStatus = "Vigente" | "Programada" | "Vencida" | "Inactiva";

/**
 * State shown in the list. `today` is the Asunción calendar day (`yyyy-mm-dd`); the window is
 * inclusive on both ends. Allowed weekdays do not change the status.
 */
export function promoStatus(
  promo: { isActive: boolean; startsAt: string | null; endsAt: string | null },
  today: string,
): PromoStatus {
  if (!promo.isActive) return "Inactiva";
  if (promo.startsAt && today < promo.startsAt) return "Programada";
  if (promo.endsAt && today > promo.endsAt) return "Vencida";
  return "Vigente";
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function formatPromoScope(promo: {
  scope: "all" | "lots" | "products";
  lotCount: number;
  productCount: number;
}): string {
  if (promo.scope === "all") return "Todos los productos";
  if (promo.scope === "lots") return plural(promo.lotCount, "marca", "marcas");
  return plural(promo.productCount, "producto", "productos");
}
