import { notFound } from "next/navigation";
import { DeleteDiscountButton } from "../../../../components/discount-controls";
import { DiscountForm } from "../../../../components/discount-form";
import { PageHeader } from "../../../../components/page-header";
import { getDb } from "../../../../lib/db";
import { getDiscountForEdit, getPickerProducts } from "../../../../lib/queries/discounts";
import { deleteDiscountAction, saveDiscountAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditDiscountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const discount = await getDiscountForEdit(db, id);
  if (!discount) notFound();
  const products = await getPickerProducts(db);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={discount.name}
        description="Editá el porcentaje, las fechas y los productos."
        actions={
          <DeleteDiscountButton
            discountId={discount.id}
            name={discount.name}
            action={deleteDiscountAction}
            redirectTo="/descuentos"
          />
        }
      />
      <DiscountForm
        products={products}
        initial={{
          name: discount.name,
          percent: String(discount.percent),
          isActive: discount.isActive,
          startsAt: discount.startsAt ?? "",
          endsAt: discount.endsAt ?? "",
          scope: discount.scope,
          productIds: discount.productIds,
        }}
        action={saveDiscountAction.bind(null, discount.id)}
      />
    </div>
  );
}
