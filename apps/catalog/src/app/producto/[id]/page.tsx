import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductContact } from "../../../components/product-contact";
import { getDb } from "../../../lib/db";
import { formatGs } from "../../../lib/format";
import { getCatalogSettings, getProduct } from "../../../lib/queries";

type Params = Promise<{ id: string }>;

// Publication, stock and settings change from the ERP at any time.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const db = getDb();
  const product = await getProduct(db, await getCatalogSettings(db), (await params).id);
  return { title: product ? `${product.name} · atika` : "atika" };
}

export default async function ProductPage({ params }: { params: Params }) {
  const db = getDb();
  const settings = await getCatalogSettings(db);
  const product = await getProduct(db, settings, (await params).id);
  if (!product) notFound();

  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-2">
      {/* Photo placeholder: sand surface with an offset block until real photos exist. */}
      <div className="relative aspect-[3/4] bg-sand">
        <div aria-hidden="true" className="absolute bottom-6 left-6 size-1/3 bg-subtle" />
      </div>
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-5xl leading-tight text-ink">{product.name}</h1>
        <div className="flex flex-col gap-1">
          <p className="text-2xl text-ink">
            {product.priceGs === null ? "Consultar precio" : formatGs(product.priceGs)}
          </p>
          {product.priceGs === null ? null : <p className="text-xs text-muted">IVA incluido</p>}
        </div>
        <ProductContact
          productName={product.name}
          sizes={product.sizes}
          whatsappNumber={settings.whatsappNumber}
          messageTemplate={settings.messageTemplate}
        />
      </div>
    </section>
  );
}
