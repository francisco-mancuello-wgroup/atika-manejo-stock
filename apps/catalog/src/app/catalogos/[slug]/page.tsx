import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { type BookCatalog, LookbookBook } from "../../../components/lookbook/book";
import { CartProvider } from "../../../components/lookbook/cart";
import { CATALOG_COVERS, OTHER_BRANDS_COVER } from "../../../lib/catalog-covers";
import { getDb } from "../../../lib/db";
import {
  ALL_CATALOGS,
  CATALOGS,
  findCatalog,
  OTHER_BRANDS,
  PINK_EVENT,
  pinkPages,
  withPieces,
} from "../../../lib/lookbook";
import { getCatalogSettings, listLookbook, listPinkOnly } from "../../../lib/queries";
import { requestOrigin } from "../../../lib/whatsapp";

type Params = Promise<{ slug: string }>;

// Products, stock and settings change from the ERP at any time.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  if (slug === ALL_CATALOGS) return { title: "Catálogos · Átika" };
  if (slug === PINK_EVENT) return { title: "Pink · Átika" };
  const catalog = findCatalog(slug);
  return { title: catalog ? `${catalog.name} — ${catalog.tagline} · Átika` : "Átika" };
}

/**
 * `/catalogos/<slug>`: one lookbook; `/catalogos/todos` chains the three, and
 * `/catalogos/pink` chains only their pink pieces (Pink), plus the Pink pieces placed in no
 * catalog: after their brand's catalog, or under Otras marcas.
 */
export default async function CatalogPage({ params }: { params: Params }) {
  const { slug } = await params;
  const pink = slug === PINK_EVENT;
  const all = slug === ALL_CATALOGS || pink;
  const shown = all ? [...CATALOGS] : CATALOGS.filter((catalog) => catalog.slug === slug);
  const first = shown[0];
  if (!first) notFound();
  const db = getDb();
  const settings = await getCatalogSettings(db);
  const [pages, pinkOnly] = await Promise.all([
    listLookbook(db, settings),
    pink ? listPinkOnly(db, settings) : null,
  ]);
  const requestHeaders = await headers();
  const catalogs: BookCatalog[] = shown.map((catalog) => ({
    ...catalog,
    cover: CATALOG_COVERS[catalog.slug],
    pages: pinkOnly
      ? pinkPages([...pages[catalog.slug], ...pinkOnly[catalog.slug]])
      : pages[catalog.slug],
  }));
  if (pinkOnly) {
    catalogs.push({
      ...OTHER_BRANDS,
      cover: OTHER_BRANDS_COVER,
      pages: pinkPages(pinkOnly[OTHER_BRANDS.slug]),
    });
  }
  return (
    <CartProvider whatsappNumber={settings.whatsappNumber}>
      <LookbookBook
        title={pink ? "Pink" : all ? "Átika" : first.name}
        // Pink and "todos" skip the catalogs without pieces to show
        catalogs={all ? withPieces(catalogs) : catalogs}
        origin={requestOrigin((name) => requestHeaders.get(name))}
        pagePath={`/catalogos/${slug}`}
      />
    </CartProvider>
  );
}
