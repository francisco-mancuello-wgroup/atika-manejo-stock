import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogPage } from "../../../../components/catalog-page";
import type { SearchParams } from "../../../../lib/catalog-filters";
import { findCategory } from "../../../../lib/categories";

type Params = Promise<{ categoria: string }>;

// Products and settings change from the ERP at any time.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const category = findCategory((await params).categoria);
  return { title: category ? `${category.label} · atika` : "atika" };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<SearchParams>;
}) {
  const category = findCategory((await params).categoria);
  if (!category) notFound();
  return CatalogPage({ slug: category.slug, searchParams });
}
