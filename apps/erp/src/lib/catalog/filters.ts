export const CATALOG_STATUSES = ["todos", "visibles", "ocultos", "sin-stock"] as const;
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];

/** Lookbook filter slugs (`?catalogo=`); `ninguno` means pieces outside every lookbook. */
export const LOOKBOOK_FILTERS = ["casa-icona", "milonga", "sordo", "ninguno"] as const;
export type LookbookFilter = (typeof LOOKBOOK_FILTERS)[number];

export interface CatalogFilters {
  status: CatalogStatus;
  query?: string;
  catalog?: LookbookFilter;
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
  const lookbook = first(searchParams.catalogo);
  const catalog = LOOKBOOK_FILTERS.find((candidate) => candidate === lookbook);
  return {
    status: CATALOG_STATUSES.find((candidate) => candidate === status) ?? "todos",
    ...(catalog ? { catalog } : {}),
    ...(query ? { query } : {}),
  };
}

/** Link to the catalog page for the given filters (omits defaults to keep URLs short). */
export function catalogHref(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.status !== "todos") params.set("estado", filters.status);
  if (filters.catalog) params.set("catalogo", filters.catalog);
  if (filters.query) params.set("q", filters.query);
  const search = params.toString();
  return search ? `/catalogo-web?${search}` : "/catalogo-web";
}
