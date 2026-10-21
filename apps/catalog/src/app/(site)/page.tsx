import Image from "next/image";
import Link from "next/link";
import { getDb } from "../../lib/db";
import { getCatalogSettings, listCollections } from "../../lib/queries";

// Products and settings change from the ERP at any time.
export const dynamic = "force-dynamic";

/** `/`: one card per collection (supplier lot), each opening its full-screen presentation. */
export default async function CollectionsPage() {
  const db = getDb();
  const collections = await listCollections(db, await getCatalogSettings(db));
  return (
    <div className="flex flex-col gap-8 px-5 py-8 md:px-7 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted">
            Prendas seleccionadas
          </p>
          <h1 className="font-display text-[34px] font-light leading-none text-ink lg:text-[44px]">
            Colecciones
          </h1>
        </div>
        <Link
          href="/ver-todo"
          className="text-[13px] text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          Ver todo el catálogo
        </Link>
      </header>

      {collections.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay colecciones publicadas.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
          {collections.map((collection) => (
            <li key={collection.slug}>
              <Link
                href={`/catalogos/${collection.slug}`}
                className="group flex flex-col gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
              >
                <div className="relative aspect-[3/4] overflow-hidden border border-line bg-surface">
                  {collection.coverUrl ? (
                    <Image
                      src={collection.coverUrl}
                      alt={collection.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : null}
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="font-display text-[22px] font-light leading-tight text-ink">
                    {collection.name}
                  </h2>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
                    {collection.count} {collection.count === 1 ? "pieza" : "piezas"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
