import { headers } from "next/headers";
import { CatalogShelf, LookbookBook } from "../components/lookbook/book";
import { CartProvider } from "../components/lookbook/cart";
import { toBookCatalog } from "../lib/catalog-covers";
import { getDb } from "../lib/db";
import { hasPinkPieces } from "../lib/lookbook";
import { getCatalogSettings, listLookbook } from "../lib/queries";
import { requestOrigin } from "../lib/whatsapp";

// Products, stock and settings change from the ERP at any time.
export const dynamic = "force-dynamic";

/**
 * `/`: the whole lookbook. First the covers of the active brands and "Ver todo", then, scrolling
 * down, each brand's catalog one after the other, in the order set in the ERP.
 */
export default async function HomePage() {
  const db = getDb();
  const settings = await getCatalogSettings(db);
  const brands = await listLookbook(db, settings);
  const requestHeaders = await headers();
  const catalogs = brands.map((brand) => toBookCatalog(brand));
  return (
    <CartProvider whatsappNumber={settings.whatsappNumber}>
      <LookbookBook
        title="Átika"
        catalogs={catalogs}
        origin={requestOrigin((name) => requestHeaders.get(name))}
        pagePath="/"
        intro={
          <CatalogShelf catalogs={catalogs} pink={hasPinkPieces(brands.map((b) => b.pages))} />
        }
      />
    </CartProvider>
  );
}
