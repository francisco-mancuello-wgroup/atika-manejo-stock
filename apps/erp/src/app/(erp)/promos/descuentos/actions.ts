"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type FormState, formValues } from "../../../../lib/action-state";
import { requireSession } from "../../../../lib/auth/session";
import { getDb } from "../../../../lib/db";
import { deleteDiscount, saveDiscount, setDiscountActive } from "../../../../lib/discounts/save";

const FAILED = {
  status: "error",
  message: "No se pudo guardar. Intentá de nuevo en unos segundos.",
} as const;

function productIdsOf(formData: FormData): string[] {
  return formData.getAll("productIds").filter((id): id is string => typeof id === "string");
}

/** Prices change everywhere: the ERP list, the sale form and the public catalog read them. */
function revalidateDiscounts() {
  revalidatePath("/promos/descuentos");
  revalidatePath("/ventas");
}

/** "Guardar" on the edit page: bound to the discount id by the page. */
export async function saveDiscountAction(
  discountId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const values = formValues(formData);
  try {
    const state = await saveDiscount(getDb(), discountId, values, productIdsOf(formData));
    if (state.status === "success") revalidateDiscounts();
    return state;
  } catch (error) {
    console.error("saveDiscountAction failed", error);
    return { ...FAILED, values };
  }
}

/** "Guardar" on the new discount page; goes back to the list on success. */
export async function createDiscountAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const values = formValues(formData);
  try {
    const state = await saveDiscount(getDb(), null, values, productIdsOf(formData));
    if (state.status !== "success") return state;
    revalidateDiscounts();
  } catch (error) {
    console.error("createDiscountAction failed", error);
    return { ...FAILED, values };
  }
  redirect("/promos/descuentos");
}

export async function setDiscountActiveAction(
  discountId: string,
  isActive: boolean,
): Promise<FormState> {
  await requireSession();
  try {
    const state = await setDiscountActive(getDb(), discountId, isActive);
    if (state.status === "success") revalidateDiscounts();
    return state;
  } catch (error) {
    console.error("setDiscountActiveAction failed", error);
    return FAILED;
  }
}

export async function deleteDiscountAction(discountId: string): Promise<FormState> {
  await requireSession();
  try {
    const state = await deleteDiscount(getDb(), discountId);
    if (state.status === "success") revalidateDiscounts();
    return state;
  } catch (error) {
    console.error("deleteDiscountAction failed", error);
    return FAILED;
  }
}
