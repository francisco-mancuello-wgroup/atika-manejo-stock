import Link from "next/link";
import { type CatalogFilters, catalogHref, hasActiveFilters } from "../lib/catalog-filters";

export function CatalogEmpty({ slug, filters }: { slug: string; filters: CatalogFilters }) {
  if (!hasActiveFilters(filters)) {
    return <p className="py-8 text-sm text-muted">Todavía no hay prendas publicadas.</p>;
  }
  return (
    <div className="flex flex-col items-start gap-3 py-8">
      <p className="text-sm text-muted">No encontramos prendas con esos filtros.</p>
      <Link
        href={catalogHref(slug, filters, { talle: null, q: null, orden: "recientes" })}
        className="inline-flex h-10 items-center border border-line bg-surface px-4 text-sm text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Quitar filtros
      </Link>
    </div>
  );
}
