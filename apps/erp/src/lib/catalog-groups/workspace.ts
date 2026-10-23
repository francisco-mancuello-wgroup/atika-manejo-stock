export type CatalogTab = "prendas" | "grupos" | "marcas";

type SearchParams = Record<string, string | string[] | undefined>;

const NEW = "nuevo";

/** The Grupos tab of the web catalog: the table of groups. */
export const GROUPS_LIST_HREF = "/catalogo-web?tab=grupos";
export const NEW_GROUP_HREF = `/catalogo-web/grupos/${NEW}`;

export function groupHref(groupId: string) {
  return `/catalogo-web/grupos/${groupId}`;
}

function first(value: string | string[] | undefined): string | undefined {
  const text = (Array.isArray(value) ? value[0] : value)?.trim();
  return text ? text : undefined;
}

/** `?tab=grupos` and `?tab=marcas` are those tabs; anything else is the Prendas tab. */
export function parseCatalogTab(searchParams: SearchParams): CatalogTab {
  const tab = first(searchParams.tab);
  return tab === "grupos" || tab === "marcas" ? tab : "prendas";
}

/** Old `?tab=grupos&grupo=<id|nuevo>` links to the group page that replaced the side panel. */
export function legacyGroupRedirect(searchParams: SearchParams): string | null {
  if (parseCatalogTab(searchParams) !== "grupos") return null;
  const group = first(searchParams.grupo);
  if (!group) return null;
  return group === NEW ? NEW_GROUP_HREF : groupHref(group);
}
