import { parseCatalogFilters, type SearchParams } from "../lib/catalog-filters";
import { getDb } from "../lib/db";
import { countProductsByCategory, getCatalogSettings, listProducts } from "../lib/queries";
import { CatalogEmpty } from "./catalog-empty";
import { CatalogLayout } from "./catalog-layout";
import { ProductGrid } from "./product-grid";

/** Server component behind `/` and `/[categoria]`: reads the filters of the URL and lists. */
export async function CatalogPage({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: Promise<SearchParams>;
}) {
  const filters = parseCatalogFilters(await searchParams);
  const db = getDb();
  const settings = await getCatalogSettings(db);
  // "novedades" is every published product; the other slugs are stored in Product.category.
  const [products, counts] = await Promise.all([
    listProducts(db, settings, slug === "novedades" ? null : slug, filters),
    countProductsByCategory(db, settings, filters),
  ]);
  return (
    <CatalogLayout slug={slug} filters={filters} counts={counts} total={products.length}>
      {products.length === 0 ? (
        <CatalogEmpty slug={slug} filters={filters} />
      ) : (
        <ProductGrid products={products} />
      )}
    </CatalogLayout>
  );
}
