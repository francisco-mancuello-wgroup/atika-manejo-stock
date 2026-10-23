import { PageHeader } from "../../../../components/page-header";
import { ProductForm } from "../../../../components/product-form";
import { listBrandNames } from "../../../../lib/brands/save";
import { getDb } from "../../../../lib/db";
import { getLotPricingContexts } from "../../../../lib/queries/products";
import { createProductAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [lots, brandNames] = await Promise.all([getLotPricingContexts(), listBrandNames(getDb())]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nuevo producto"
        description="Elegí el lote y completá los datos. Queda oculto en el catálogo hasta que lo publiques."
      />
      <ProductForm mode="new" lots={lots} brandNames={brandNames} action={createProductAction} />
    </div>
  );
}
