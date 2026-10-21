export const CATEGORIES = [
  { slug: "novedades", label: "Novedades" },
  { slug: "vestidos", label: "Vestidos" },
  { slug: "tops", label: "Tops" },
  { slug: "faldas-y-shorts", label: "Faldas y shorts" },
  { slug: "accesorios", label: "Accesorios" },
] as const;

export type Category = (typeof CATEGORIES)[number];

export function findCategory(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}
