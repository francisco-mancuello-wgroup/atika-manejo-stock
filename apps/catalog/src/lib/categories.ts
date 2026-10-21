import { CATALOG_CATEGORIES } from "@atika/db/categories";

/** Navigation entries: "novedades" lists every published product; the rest come from the database package. */
export const CATEGORIES = [
  { slug: "novedades", label: "Novedades" },
  ...CATALOG_CATEGORIES,
] as const;

export type Category = (typeof CATEGORIES)[number];

export function findCategory(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}
