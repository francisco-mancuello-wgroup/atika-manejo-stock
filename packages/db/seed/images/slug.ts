const MAX_SLUG = 60;

/** Lowercase, accent-free, hyphenated form used for folder and file names. */
export function slugify(text: string): string {
  const slug = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG)
    .replace(/-+$/g, "");
  return slug || "producto";
}

export interface NamedProduct {
  code: string | null;
  name: string;
  /** How many images the product gets. */
  images: number;
}

/**
 * Deterministic `<lot-slug>/<code-name>[-n].webp` names, one list per product in product order.
 * The first file of a stem has no suffix; later ones (a second photo, or another product with the
 * same code and name) get -2, -3, ... in product order.
 */
export function assignFileNames(lotSlug: string, products: NamedProduct[]): string[][] {
  const used = new Map<string, number>();
  return products.map((product) => {
    const stem = slugify([product.code, product.name].filter(Boolean).join(" "));
    return Array.from({ length: product.images }, () => {
      const count = (used.get(stem) ?? 0) + 1;
      used.set(stem, count);
      return `${lotSlug}/${count === 1 ? stem : `${stem}-${count}`}.webp`;
    });
  });
}
