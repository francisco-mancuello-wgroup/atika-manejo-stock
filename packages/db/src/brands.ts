import type { Brand, PrismaClient } from "./generated/prisma/client";

/** Where pieces without a brand, or with one nobody registered, go. */
export const FALLBACK_BRAND_NAME = "Otras marcas";
export const FALLBACK_BRAND_SLUG = "otras-marcas";

/** `/catalogos/<slug>` routes that are not brands. */
const RESERVED_SLUGS = new Set(["todos", "pink"]);

/** Case-insensitive identity of a brand: `Product.brand` is matched to `Brand.key`. */
export function brandKey(name: string | null | undefined): string {
  return name?.trim().toLowerCase() ?? "";
}

/** Accent-free kebab slug; never a route the catalog already owns. */
export function brandSlug(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) return "marca";
  return RESERVED_SLUGS.has(slug) ? `${slug}-marca` : slug;
}

/**
 * The brand of a product by its free-text name: a registered brand, else the fallback. Null only
 * when no fallback row exists to land on.
 */
export function resolveBrand<T extends Pick<Brand, "key" | "isFallback">>(
  name: string | null | undefined,
  brands: readonly T[],
): T | null {
  const key = brandKey(name);
  const found = key ? brands.find((brand) => brand.key === key && !brand.isFallback) : undefined;
  return found ?? brands.find((brand) => brand.isFallback) ?? null;
}

type BrandDb = Pick<PrismaClient, "brand">;

async function ensureFallback(db: BrandDb): Promise<Brand> {
  const existing = await db.brand.findFirst({ where: { isFallback: true } });
  if (existing) return existing;
  const last = await db.brand.aggregate({ _max: { position: true } });
  return db.brand.create({
    data: {
      name: FALLBACK_BRAND_NAME,
      key: brandKey(FALLBACK_BRAND_NAME),
      slug: FALLBACK_BRAND_SLUG,
      position: (last._max.position ?? -1) + 1,
      isFallback: true,
    },
  });
}

/**
 * The brand a product is saved with: an existing one (any case), the fallback for a blank name,
 * or a new active brand placed before the fallback. Safe inside a transaction (a concurrent
 * insert is skipped, not raised).
 */
export async function ensureBrand(db: BrandDb, name: string | null | undefined): Promise<Brand> {
  const key = brandKey(name);
  const fallback = await ensureFallback(db);
  if (!key || key === fallback.key) return fallback;
  const existing = await db.brand.findUnique({ where: { key } });
  if (existing) return existing;

  const display = (name ?? "").trim();
  const base = brandSlug(display);
  const taken = await db.brand.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  });
  const slugs = new Set(taken.map((row) => row.slug));
  let slug = base;
  for (let n = 2; slugs.has(slug); n += 1) slug = `${base}-${n}`;

  // The fallback stays last: the new brand takes its position and pushes it one down.
  await db.brand.update({ where: { id: fallback.id }, data: { position: fallback.position + 1 } });
  await db.brand.createMany({
    data: [{ name: display, key, slug, position: fallback.position }],
    skipDuplicates: true,
  });
  const created = await db.brand.findUnique({ where: { key } });
  if (!created) throw new Error(`Could not register the brand "${display}"`);
  return created;
}
