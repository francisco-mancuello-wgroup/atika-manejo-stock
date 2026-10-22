import { headers } from "next/headers";
import { CatalogShelf, LookbookBook } from "../components/lookbook/book";
import { CartProvider } from "../components/lookbook/cart";
import { CATALOG_COVERS } from "../lib/catalog-covers";
import { getDb } from "../lib/db";
import { CATALOGS, hasPinkPieces, withPieces } from "../lib/lookbook";
import { getCatalogSettings, listLookbook } from "../lib/queries";
import { requestOrigin } from "../lib/whatsapp";

// Products, stock and settings change from the ERP at any time.
export const dynamic = "force-dynamic";

/**
 * `/`: the whole lookbook. First the three catalog covers and "Ver todo", then, scrolling down,
 * Casa Icona, Milonga and Sordo one after the other.
 */
export default async function HomePage() {
  const db = getDb();
  const settings = await getCatalogSettings(db);
  const pages = await listLookbook(db, settings);
  const requestHeaders = await headers();
  const catalogs = withPieces(
    CATALOGS.map((catalog) => ({
      ...catalog,
      cover: CATALOG_COVERS[catalog.slug],
      pages: pages[catalog.slug],
    })),
  );
  return (
    <CartProvider whatsappNumber={settings.whatsappNumber}>
      <LookbookBook
        title="Átika"
        catalogs={catalogs}
        origin={requestOrigin((name) => requestHeaders.get(name))}
        pagePath="/"
        intro={<CatalogShelf catalogs={catalogs} pink={hasPinkPieces(Object.values(pages))} />}
      />
    </CartProvider>
  );
}
