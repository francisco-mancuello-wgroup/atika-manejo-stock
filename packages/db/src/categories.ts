/**
 * Storefront categories. `Product.category` stores the slug. Pure data with no runtime
 * dependencies (import it as `@atika/db/categories`), so client components and tests in both
 * apps can use it without loading the Prisma client.
 */
export const CATALOG_CATEGORIES = [
  { slug: "vestidos", label: "Vestidos" },
  { slug: "tops", label: "Tops" },
  { slug: "faldas-y-shorts", label: "Faldas y shorts" },
  { slug: "accesorios", label: "Accesorios" },
] as const;

export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];
export type CatalogCategorySlug = CatalogCategory["slug"];

export function findCatalogCategory(slug: string): CatalogCategory | undefined {
  return CATALOG_CATEGORIES.find((category) => category.slug === slug);
}

export function isCatalogCategory(value: string | null | undefined): value is CatalogCategorySlug {
  return typeof value === "string" && findCatalogCategory(value) !== undefined;
}
