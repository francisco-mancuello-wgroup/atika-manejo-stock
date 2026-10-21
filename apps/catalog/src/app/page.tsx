import { CatalogPage } from "../components/catalog-page";
import type { SearchParams } from "../lib/catalog-filters";

// Products and settings change from the ERP at any time.
export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return CatalogPage({ slug: "novedades", searchParams });
}
