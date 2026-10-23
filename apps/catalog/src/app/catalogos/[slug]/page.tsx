import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { type BookCatalog, LookbookBook } from "../../../components/lookbook/book";
import { CartProvider } from "../../../components/lookbook/cart";
import { toBookCatalog } from "../../../lib/catalog-covers";
import { getDb } from "../../../lib/db";
import { ALL_CATALOGS, brandTagline, PINK_EVENT, pinkPages } from "../../../lib/lookbook";
import { getBrandLookbook, getCatalogSettings, listLookbook } from "../../../lib/queries";
import { requestOrigin } from "../../../lib/whatsapp";

type Params = Promise<{ slug: string }>;

// Products, stock and settings change from the ERP at any time.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  if (slug === ALL_CATALOGS) return { title: "Catálogos · Átika" };
  if (slug === PINK_EVENT) return { title: "Pink · Átika" };
  const db = getDb();
  const brand = await getBrandLookbook(db, await getCatalogSettings(db), slug);
  return { title: brand ? `${brand.name} — ${brandTagline(brand.slug)} · Átika` : "Átika" };
}

/**
 * `/catalogos/<slug>`: the lookbook of one active brand (the slugs casa-icona, milonga and sordo
 * are the brands of the same name); `/catalogos/todos` chains every brand with pieces, and
 * `/catalogos/pink` chains only their pink pieces (Pink). An unknown or inactive brand is a 404.
 */
export default async function CatalogPage({ params }: { params: Params }) {
  const { slug } = await params;
  const db = getDb();
  const settings = await getCatalogSettings(db);
  const pink = slug === PINK_EVENT;
  const all = slug === ALL_CATALOGS || pink;
  let catalogs: BookCatalog[];
  let title: string;
  if (all) {
    const brands = await listLookbook(db, settings);
    catalogs = brands
      .map((brand) => toBookCatalog(brand, pink ? pinkPages(brand.pages) : brand.pages))
      // Pink and "todos" skip the brands without pieces to show
      .filter((catalog) => catalog.pages.length > 0);
    title = pink ? "Pink" : "Átika";
  } else {
    const brand = await getBrandLookbook(db, settings, slug);
    if (!brand) notFound();
    catalogs = [toBookCatalog(brand)];
    title = brand.name;
  }
  const requestHeaders = await headers();
  return (
    <CartProvider whatsappNumber={settings.whatsappNumber}>
      <LookbookBook
        title={title}
        catalogs={catalogs}
        origin={requestOrigin((name) => requestHeaders.get(name))}
        pagePath={`/catalogos/${slug}`}
      />
    </CartProvider>
  );
}
