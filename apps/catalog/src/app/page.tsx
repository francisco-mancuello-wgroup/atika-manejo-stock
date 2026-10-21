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
      <section className="mx-auto flex max-w-[1440px] flex-col justify-between gap-4 px-5 pt-10 pb-8 md:flex-row md:items-end md:px-16 md:pt-14 md:pb-10">
        <div className="flex max-w-[640px] flex-col gap-3">
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted">
            Novedades
          </p>
          <h1 className="font-display text-4xl font-medium leading-[1.05] text-ink md:text-[57px]">
            {settings.heroText}
          </h1>
        </div>
        <p className="text-[13px] text-muted">
          Precios con IVA incluido · Consultas y reservas por WhatsApp
        </p>
      </section>
      <section className="mx-auto max-w-[1440px] px-5 pb-12 md:px-16 md:pb-16">
        <ProductGrid products={products} />
      </section>
    </>
  );
}
