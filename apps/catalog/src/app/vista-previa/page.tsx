import Link from "next/link";
import { AtikaWordmark } from "../../components/lookbook/wordmark";
import { CATALOGS } from "../../lib/lookbook";

/**
 * What link preview fetchers get for `/` (see `proxy.ts`): the layout's metadata and share
 * image, with a tiny body. People reaching this URL see the three catalogs to open.
 */
export default function PreviewPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <AtikaWordmark />
      <h1 className="font-heading text-[34px]">Catálogos</h1>
      <ul className="flex flex-wrap justify-center gap-3">
        {CATALOGS.map((catalog) => (
          <li key={catalog.slug}>
            <Link
              href={`/#${catalog.slug}`}
              className="inline-flex min-h-12 items-center border border-foreground px-6 text-[15px] tracking-[1px]"
            >
              {catalog.name}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
