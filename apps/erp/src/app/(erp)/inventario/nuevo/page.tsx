import { PageHeader } from "../../../../components/page-header";
import { ProductForm } from "../../../../components/product-form";
import { getLotPricingContexts } from "../../../../lib/queries/products";
import { createProductAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const lots = await getLotPricingContexts();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nuevo producto"
        description="Elegí el lote y completá los datos. Queda oculto en el catálogo hasta que lo publiques."
      />
      <ProductForm mode="new" lots={lots} action={createProductAction} />
    </div>
  );
}
