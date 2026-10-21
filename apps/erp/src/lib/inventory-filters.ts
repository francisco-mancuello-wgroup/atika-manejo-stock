export interface InventoryFilters {
  lotId?: string;
  query?: string;
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const text = (Array.isArray(value) ? value[0] : value)?.trim();
  return text ? text : undefined;
}

/** `?lot=<lotId>&q=<text>` to filters; blank or repeated values collapse safely. */
export function parseInventoryFilters(searchParams: SearchParams): InventoryFilters {
  const lotId = first(searchParams.lot);
  const query = first(searchParams.q);
  return {
    ...(lotId ? { lotId } : {}),
    ...(query ? { query } : {}),
  };
}
