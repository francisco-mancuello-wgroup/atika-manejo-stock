"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type FormState, formValues } from "../../../lib/action-state";
import { requireSession } from "../../../lib/auth/session";
import { getDb } from "../../../lib/db";
import { readPhotoFields } from "../../../lib/products/form-data";
import { localPhotoStorage } from "../../../lib/products/local-photo-storage";
import { createProduct, updateProduct } from "../../../lib/products/save";

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
      storage: localPhotoStorage(),
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
    const state = await createProduct(getDb(), values, { ...photos, storage: localPhotoStorage() });
    if (state.status !== "success") return state;
    productId = state.productId;
    revalidateProduct(productId);
  } catch (error) {
    console.error("createProductAction failed", error);
    return { ...FAILED, values };
  }
  redirect(`/inventario/${productId}`);
}
