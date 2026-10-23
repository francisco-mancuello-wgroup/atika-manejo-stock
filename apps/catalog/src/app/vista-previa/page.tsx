import Link from "next/link";
import { AtikaWordmark } from "../../components/lookbook/wordmark";
import { getDb } from "../../lib/db";
import { getCatalogSettings, listLookbook } from "../../lib/queries";

// The active brands change from the ERP at any time.
export const dynamic = "force-dynamic";

/**
 * What link preview fetchers get for `/` (see `proxy.ts`): the layout's metadata and share
 * image, with a tiny body. People reaching this URL see the active brands to open.
 */
export default async function PreviewPage() {
  const db = getDb();
  const brands = await listLookbook(db, await getCatalogSettings(db));
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <AtikaWordmark />
      <h1 className="font-heading text-[34px]">Catálogos</h1>
      <ul className="flex flex-wrap justify-center gap-3">
        {brands.map((brand) => (
          <li key={brand.slug}>
            <Link
              href={`/#${brand.slug}`}
              className="inline-flex min-h-12 items-center border border-foreground px-6 text-[15px] tracking-[1px]"
            >
              {brand.name}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
