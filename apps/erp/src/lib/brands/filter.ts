import type { Prisma } from "@atika/db";
import { brandKey } from "@atika/db/brands";

type FilterDb = Pick<Prisma.TransactionClient, "brand" | "product">;

/** A brand link of the Prendas filter. */
export interface BrandFilter {
  slug: string;
  name: string;
  /** Products of the brand (Otras marcas: no brand or one nobody registered). */
  count: number;
}

/**
 * The products of a brand, resolved like the web does: `Product.brand` is matched to the
 * registered brand ignoring case, and the fallback takes everything else. Null for an unknown slug.
 */
export async function brandProductWhere(
  db: Pick<FilterDb, "brand">,
  slug: string,
): Promise<Prisma.ProductWhereInput | null> {
  const brands = await db.brand.findMany();
  const brand = brands.find((candidate) => candidate.slug === slug);
  if (!brand) return null;
  const same = (name: string): Prisma.ProductWhereInput => ({
    brand: { equals: name, mode: "insensitive" },
  });
  if (!brand.isFallback) return same(brand.name);
  const registered = brands.filter((candidate) => !candidate.isFallback);
  return {
    OR: [
      { brand: null },
      ...(registered.length ? [{ NOT: { OR: registered.map((b) => same(b.name)) } }] : []),
    ],
  };
}

/** Every brand in display order with its product count; Otras marcas is last. */
export async function listBrandFilters(db: FilterDb): Promise<BrandFilter[]> {
  const [brands, products] = await Promise.all([
    db.brand.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] }),
    db.product.groupBy({ by: ["brand"], _count: { _all: true } }),
  ]);
  const byKey = new Map(brands.filter((b) => !b.isFallback).map((brand) => [brand.key, brand.id]));
  const fallback = brands.find((brand) => brand.isFallback);
  const counts = new Map<string, number>();
  for (const row of products) {
    const id = byKey.get(brandKey(row.brand)) ?? fallback?.id;
    if (id) counts.set(id, (counts.get(id) ?? 0) + row._count._all);
  }
  return brands.map((brand) => ({
    slug: brand.slug,
    name: brand.name,
    count: counts.get(brand.id) ?? 0,
  }));
}
