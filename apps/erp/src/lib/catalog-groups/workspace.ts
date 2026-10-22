export type CatalogTab = "prendas" | "grupos";

export interface GroupsSelection {
  tab: CatalogTab;
  /** Selected group; null when none or when creating. */
  groupId: string | null;
  isNew: boolean;
}

type SearchParams = Record<string, string | string[] | undefined>;

const NEW = "nuevo";

function first(value: string | string[] | undefined): string | undefined {
  const text = (Array.isArray(value) ? value[0] : value)?.trim();
  return text ? text : undefined;
}

/** `?tab=grupos&grupo=<id|nuevo>` to the selection; anything else is the Prendas tab. */
export function parseGroupsSelection(searchParams: SearchParams): GroupsSelection {
  if (first(searchParams.tab) !== "grupos") return { tab: "prendas", groupId: null, isNew: false };
  const group = first(searchParams.grupo);
  return {
    tab: "grupos",
    groupId: group && group !== NEW ? group : null,
    isNew: group === NEW,
  };
}

export function groupsHref({ groupId, isNew }: { groupId?: string | null; isNew?: boolean }) {
  const params = new URLSearchParams({ tab: "grupos" });
  if (isNew) params.set("grupo", NEW);
  else if (groupId) params.set("grupo", groupId);
  return `/catalogo-web?${params.toString()}`;
}
