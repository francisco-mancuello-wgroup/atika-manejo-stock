"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type FormState, formValues } from "../../../lib/action-state";
import { requireSession } from "../../../lib/auth/session";
import { notifyCatalogChanged } from "../../../lib/catalog-live";
import { getDb } from "../../../lib/db";
import { deleteProduct } from "../../../lib/products/delete";
import { readPhotoFields } from "../../../lib/products/form-data";
import { createProduct, updateProduct } from "../../../lib/products/save";
import { productPhotoStorage } from "../../../lib/products/storage";

const FAILED = {
  status: "error",
  message: "No se pudo guardar. Intentá de nuevo en unos segundos.",
} as const;

function revalidateProduct(productId: string) {
  for (const path of [
    "/inventario",
    `/inventario/${productId}`,
    "/compras",
    "/catalogo-web",
    "/",
    "/ventas",
  ]) {
    revalidatePath(path);
  }
  revalidatePath("/compras/[lotId]", "page");
  notifyCatalogChanged();
}

/** "Guardar" on the edit page: bound to the product id by the page. */
export async function saveProductAction(
  productId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const values = formValues(formData);
  try {
    const photos = await readPhotoFields(formData);
    const state = await updateProduct(getDb(), productId, values, {
      ...photos,
      storage: productPhotoStorage(),
    });
    if (state.status === "success") revalidateProduct(productId);
    return state;
  } catch (error) {
    console.error("saveProductAction failed", error);
    return { ...FAILED, values };
  }
}

/** "Guardar" on the new product page; goes to the product's edit page on success. */
export async function createProductAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const values = formValues(formData);
  let productId: string;
  try {
    const photos = await readPhotoFields(formData);
    const state = await createProduct(getDb(), values, {
      ...photos,
      storage: productPhotoStorage(),
    });
    if (state.status !== "success") return state;
    productId = state.productId;
    revalidateProduct(productId);
  } catch (error) {
    console.error("createProductAction failed", error);
    return { ...FAILED, values };
  }
  redirect(`/inventario/${productId}`);
}

/**
 * "Eliminar producto" on the edit page: only products that never sold. A refusal comes back as
 * form state; on success it goes to the inventory with the product name in the notice.
 */
export async function deleteProductAction(productId: string): Promise<FormState> {
  await requireSession();
  let name: string;
  try {
    const result = await deleteProduct(getDb(), productId, productPhotoStorage());
    if (result.status !== "success") return result;
    name = result.name;
    revalidateProduct(productId);
  } catch (error) {
    console.error("deleteProductAction failed", error);
    return { status: "error", message: "No se pudo eliminar. Intentá de nuevo en unos segundos." };
  }
  redirect(`/inventario?eliminado=${encodeURIComponent(name)}`);
}
