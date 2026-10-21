import { formatDate } from "../format";
import type { PickerProduct } from "../queries/discounts";

/** Validity as shown in the list: open-ended, single day or a range. */
export function formatWindow(startsAt: string | null, endsAt: string | null): string {
  if (startsAt && endsAt) {
    return startsAt === endsAt
      ? formatDate(startsAt)
      : `${formatDate(startsAt)} – ${formatDate(endsAt)}`;
  }
  if (startsAt) return `Desde ${formatDate(startsAt)}`;
  if (endsAt) return `Hasta ${formatDate(endsAt)}`;
  return "Sin fechas";
}

export function formatScope(scope: "all" | "selected", productCount: number): string {
  if (scope === "all") return "Todos";
  return `${productCount} ${productCount === 1 ? "producto" : "productos"}`;
}

/** Category filter value for products without category. */
export const NO_CATEGORY = "sin-categoria";

export interface PickerFilters {
  query: string;
  lotId: string;
  category: string;
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function filterPickerProducts(
  products: readonly PickerProduct[],
  filters: PickerFilters,
): PickerProduct[] {
  const query = normalize(filters.query);
  return products.filter((product) => {
    if (query && !normalize(product.name).includes(query)) return false;
    if (filters.lotId && product.lotId !== filters.lotId) return false;
    if (filters.category === NO_CATEGORY) return product.category === null;
    if (filters.category && product.category !== filters.category) return false;
    return true;
  });
}
