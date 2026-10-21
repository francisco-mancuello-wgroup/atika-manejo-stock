import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "../../components/product-grid";
import { findCategory } from "../../lib/categories";
import { getDb } from "../../lib/db";
import { getCatalogSettings, listProducts } from "../../lib/queries";

type Params = Promise<{ categoria: string }>;

// Products and settings change from the ERP at any time.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const category = findCategory((await params).categoria);
  return { title: category ? `${category.label} · atika` : "atika" };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const category = findCategory((await params).categoria);
  if (!category) notFound();

  const db = getDb();
  const settings = await getCatalogSettings(db);
  // "novedades" is every published product, newest first; the others filter by category.
  const products = await listProducts(
    db,
    settings,
    category.slug === "novedades" ? null : category.slug,
  );
  return (
    <section className="mx-auto max-w-[1440px] px-5 py-10 md:px-16 md:py-14">
      <h1 className="mb-8 font-display text-4xl font-medium leading-[1.05] text-ink md:mb-10 md:text-[57px]">
        {category.label}
      </h1>
      <ProductGrid products={products} />
    </section>
  );
}
