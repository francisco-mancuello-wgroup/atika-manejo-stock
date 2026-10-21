import { KNOWN_SIZES } from "./sizes";

export const SORT_ORDERS = [
  { value: "recientes", label: "Más recientes" },
  { value: "precio-asc", label: "Precio: menor a mayor" },
  { value: "precio-desc", label: "Precio: mayor a menor" },
] as const;

export type SortOrder = (typeof SORT_ORDERS)[number]["value"];

/** What the visitor chose, parsed from the URL. Invalid values fall back to "no filter". */
export interface CatalogFilters {
  /** Only products with stock in this size. */
  talle: string | null;
  /** Free text matched against name and brand. */
  q: string | null;
  orden: SortOrder;
  /** Id of the product whose detail sheet is open (not validated here). */
  p: string | null;
}

export type SearchParams = Record<string, string | string[] | undefined>;

const MAX_QUERY_LENGTH = 80;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseCatalogFilters(params: SearchParams): CatalogFilters {
  const size = first(params.talle)?.trim().toUpperCase();
  const q = first(params.q)?.trim().slice(0, MAX_QUERY_LENGTH).trim();
  const orden = SORT_ORDERS.find((order) => order.value === first(params.orden))?.value;
  return {
    talle: size && KNOWN_SIZES.includes(size) ? size : null,
    q: q || null,
    orden: orden ?? "recientes",
    p: first(params.p)?.trim() || null,
  };
}

/** A size or a search narrows the list (sort and the open product do not). */
export function hasActiveFilters(filters: CatalogFilters): boolean {
  return filters.talle !== null || filters.q !== null;
}

/**
 * Link to a category keeping the current filters. `overrides` replace single values; the open
 * product is dropped unless asked for, and defaults are left out of the URL.
 */
export function catalogHref(
  slug: string,
  filters: CatalogFilters,
  overrides: Partial<CatalogFilters> = {},
): string {
  const next = { ...filters, p: null, ...overrides };
  const query = new URLSearchParams();
  if (next.talle) query.set("talle", next.talle);
  if (next.q) query.set("q", next.q);
  if (next.orden !== "recientes") query.set("orden", next.orden);
  if (next.p) query.set("p", next.p);
  const search = query.toString();
  // "novedades" is the whole list, which lives at the root of /ver-todo.
  const path = slug === "novedades" ? "/ver-todo" : `/ver-todo/${slug}`;
  return `${path}${search ? `?${search}` : ""}`;
}
