import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { LookbookBook } from "../../../components/lookbook/book";
import { CartProvider } from "../../../components/lookbook/cart";
import { CATALOG_COVERS } from "../../../lib/catalog-covers";
import { getDb } from "../../../lib/db";
import { ALL_CATALOGS, CATALOGS, findCatalog, withPieces } from "../../../lib/lookbook";
import { getCatalogSettings, listLookbook } from "../../../lib/queries";
import { requestOrigin } from "../../../lib/whatsapp";

type Params = Promise<{ slug: string }>;

// Products, stock and settings change from the ERP at any time.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  if (slug === ALL_CATALOGS) return { title: "Catálogos · Átika" };
  const catalog = findCatalog(slug);
  return { title: catalog ? `${catalog.name} — ${catalog.tagline} · Átika` : "Átika" };
}

/** `/catalogos/<slug>`: one lookbook; `/catalogos/todos` chains the three. */
export default async function CatalogPage({ params }: { params: Params }) {
  const { slug } = await params;
  const all = slug === ALL_CATALOGS;
  const shown = all ? [...CATALOGS] : CATALOGS.filter((catalog) => catalog.slug === slug);
  const first = shown[0];
  if (!first) notFound();
  const db = getDb();
  const settings = await getCatalogSettings(db);
  const pages = await listLookbook(db, settings);
  const requestHeaders = await headers();
  const catalogs = shown.map((catalog) => ({
    ...catalog,
    cover: CATALOG_COVERS[catalog.slug],
    pages: pages[catalog.slug],
  }));
  return (
    <CartProvider whatsappNumber={settings.whatsappNumber}>
      <LookbookBook
        title={all ? "Átika" : first.name}
        catalogs={all ? withPieces(catalogs) : catalogs}
        origin={requestOrigin((name) => requestHeaders.get(name))}
        pagePath={`/catalogos/${slug}`}
      />
    </CartProvider>
  );
}
