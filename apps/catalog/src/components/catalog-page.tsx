import { catalogHref, parseCatalogFilters, type SearchParams } from "../lib/catalog-filters";
import { getDb } from "../lib/db";
import {
  countProductsByCategory,
  getCatalogSettings,
  getProductDetail,
  listProducts,
} from "../lib/queries";
import { CatalogEmpty } from "./catalog-empty";
import { CatalogLayout } from "./catalog-layout";
import { ProductRows } from "./product-rows";
import { ProductSheet } from "./product-sheet";

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
  const [products, counts, detail] = await Promise.all([
    listProducts(db, settings, slug === "novedades" ? null : slug, filters),
    countProductsByCategory(db, settings, filters),
    // An unknown, unpublished or hidden id simply opens no sheet.
    filters.p ? getProductDetail(db, settings, filters.p) : null,
  ]);
  return (
    <CatalogLayout slug={slug} filters={filters} counts={counts} total={products.length}>
      {products.length === 0 ? (
        <CatalogEmpty slug={slug} filters={filters} />
      ) : (
        <ProductRows
          products={products}
          slug={slug}
          filters={filters}
          selectedId={filters.p}
          whatsappNumber={settings.whatsappNumber}
          messageTemplate={settings.messageTemplate}
        />
      )}
      {detail ? (
        <ProductSheet
          key={detail.id}
          product={detail}
          whatsappNumber={settings.whatsappNumber}
          messageTemplate={settings.messageTemplate}
          closeHref={catalogHref(slug, filters)}
        />
      ) : null}
    </CatalogLayout>
  );
}
