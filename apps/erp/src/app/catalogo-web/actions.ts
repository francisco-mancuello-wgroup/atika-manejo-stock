"use server";

import { revalidatePath } from "next/cache";
import { type FormState, formValues } from "../../lib/action-state";
import {
  publishAllInStock,
  saveCatalogSettings,
  setProductCategory,
  setProductVisibility,
} from "../../lib/catalog/save";
import { getDb } from "../../lib/db";

const FAILED = {
  status: "error",
  message: "No se pudo guardar. Intentá de nuevo en unos segundos.",
} as const;

function revalidateCatalogAdmin() {
  revalidatePath("/catalogo-web");
}

export async function setVisibilityAction(
  productId: string,
  isPublished: boolean,
): Promise<FormState> {
  try {
    const state = await setProductVisibility(getDb(), productId, isPublished);
    if (state.status === "success") revalidateCatalogAdmin();
    return state;
  } catch (error) {
    console.error("setVisibilityAction failed", error);
    return FAILED;
  }
}

export async function setCategoryAction(productId: string, category: string): Promise<FormState> {
  try {
    const state = await setProductCategory(getDb(), productId, category);
    if (state.status === "success") revalidateCatalogAdmin();
    return state;
  } catch (error) {
    console.error("setCategoryAction failed", error);
    return FAILED;
  }
}

export async function publishAllAction(): Promise<FormState> {
  try {
    const state = await publishAllInStock(getDb());
    if (state.status === "success") revalidateCatalogAdmin();
    return state;
  } catch (error) {
    console.error("publishAllAction failed", error);
    return FAILED;
  }
}

export async function saveCatalogSettingsAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  try {
    const state = await saveCatalogSettings(getDb(), values);
    if (state.status === "success") revalidateCatalogAdmin();
    return state;
  } catch (error) {
    console.error("saveCatalogSettingsAction failed", error);
    return { ...FAILED, values };
  }
}
