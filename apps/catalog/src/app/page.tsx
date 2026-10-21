import { ProductGrid } from "../components/product-grid";
import { getDb } from "../lib/db";
import { getCatalogSettings, listProducts } from "../lib/queries";

// Products and settings change from the ERP at any time.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = getDb();
  const settings = await getCatalogSettings(db);
  const products = await listProducts(db, settings, null);
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-10">
        <h1 className="font-display text-5xl leading-tight text-ink">{settings.heroText}</h1>
        <p className="mt-4 text-sm text-muted">Precios con IVA incluido · Consultas por WhatsApp</p>
      </section>
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <ProductGrid products={products} />
      </section>
    </>
  );
}
