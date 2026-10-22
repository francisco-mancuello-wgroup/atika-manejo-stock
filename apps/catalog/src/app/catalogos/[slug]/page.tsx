import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { LookbookBook } from "../../../components/lookbook/book";
import { CartProvider } from "../../../components/lookbook/cart";
import { CATALOG_COVERS } from "../../../lib/catalog-covers";
import { getDb } from "../../../lib/db";
import { ALL_CATALOGS, CATALOGS, findCatalog, PINK_EVENT, pinkPages } from "../../../lib/lookbook";
import { getCatalogSettings, listLookbook } from "../../../lib/queries";
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
 * `/catalogos/pink` chains only their pink pieces (Pink).
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
  const pages = await listLookbook(db, settings);
  const requestHeaders = await headers();
  return (
    <CartProvider whatsappNumber={settings.whatsappNumber}>
      <LookbookBook
        title={pink ? "Pink" : all ? "Átika" : first.name}
        catalogs={shown
          .map((catalog) => ({
            ...catalog,
            cover: CATALOG_COVERS[catalog.slug],
            pages: pink ? pinkPages(pages[catalog.slug]) : pages[catalog.slug],
          }))
          // Pink skips the catalogs without pink pieces
          .filter((catalog) => !pink || catalog.pages.length > 0)}
        origin={requestOrigin((name) => requestHeaders.get(name))}
        pagePath={`/catalogos/${slug}`}
      />
    </CartProvider>
  );
}
