import { notFound } from "next/navigation";
import { PageHeader } from "../../../../components/page-header";
import { ProductForm } from "../../../../components/product-form";
import { getProductForEdit } from "../../../../lib/queries/products";
import { saveProductAction } from "../actions";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = UUID.test(id) ? await getProductForEdit(id) : null;
  if (!product) notFound();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={product.name} description="Editá los datos, los talles y las fotos." />
      <ProductForm
        mode="edit"
        lots={[product.lot]}
        lotId={product.lot.id}
        photos={product.photos}
        initial={{
          name: product.name,
          code: product.code ?? "",
          brand: product.brand ?? "",
          color: product.color ?? "",
          category: product.category ?? "",
          description: product.description ?? "",
          originalValueUsd: String(product.originalValueUsd),
          sizes: product.sizes.map((size) => ({
            size: size.size,
            unitsBought: String(size.unitsBought),
            stock: String(size.stock),
          })),
        }}
        action={saveProductAction.bind(null, product.id)}
      />
    </div>
  );
}
