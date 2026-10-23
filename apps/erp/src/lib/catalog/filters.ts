export const CATALOG_STATUSES = ["todos", "visibles", "ocultos", "sin-stock"] as const;
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];

export interface CatalogFilters {
  status: CatalogStatus;
  query?: string;
  /** Brand slug (`?marca=`). */
  brand?: string;
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const text = (Array.isArray(value) ? value[0] : value)?.trim();
  return text ? text : undefined;
}

/** `?estado=visibles&q=text` to filters; unknown or repeated values collapse safely. */
export function parseCatalogFilters(searchParams: SearchParams): CatalogFilters {
  const status = first(searchParams.estado);
  const query = first(searchParams.q);
  const brand = first(searchParams.marca);
  return {
    status: CATALOG_STATUSES.find((candidate) => candidate === status) ?? "todos",
    ...(brand ? { brand } : {}),
    ...(query ? { query } : {}),
  };
}

/** Link to the catalog page for the given filters (omits defaults to keep URLs short). */
export function catalogHref(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.status !== "todos") params.set("estado", filters.status);
  if (filters.brand) params.set("marca", filters.brand);
  if (filters.query) params.set("q", filters.query);
  const search = params.toString();
  return search ? `/catalogo-web?${search}` : "/catalogo-web";
}
