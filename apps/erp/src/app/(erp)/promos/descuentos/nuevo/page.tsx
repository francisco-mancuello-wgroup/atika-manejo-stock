import { DiscountForm } from "../../../../../components/discount-form";
import { PageHeader } from "../../../../../components/page-header";
import { getDb } from "../../../../../lib/db";
import { getPickerProducts } from "../../../../../lib/queries/discounts";
import { createDiscountAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewDiscountPage() {
  const products = await getPickerProducts(getDb());
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nuevo descuento"
        description="Elegí el porcentaje, las fechas y a qué productos se aplica."
      />
      <DiscountForm products={products} action={createDiscountAction} />
    </div>
  );
}
