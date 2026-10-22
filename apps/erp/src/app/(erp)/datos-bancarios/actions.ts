"use server";

import { revalidatePath } from "next/cache";
import { type FormState, formValues } from "../../../lib/action-state";
import { requireSession } from "../../../lib/auth/session";
import { notifyCatalogChanged } from "../../../lib/catalog-live";
import { getDb } from "../../../lib/db";
import { savePaymentDetails } from "../../../lib/payment/save";

export async function savePaymentDetailsAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const values = formValues(formData);
  try {
    const state = await savePaymentDetails(getDb(), values);
    if (state.status === "success") {
      revalidatePath("/datos-bancarios");
      notifyCatalogChanged();
    }
    return state;
  } catch (error) {
    console.error("savePaymentDetailsAction failed", error);
    return {
      status: "error",
      message: "No se pudo guardar. Intentá de nuevo en unos segundos.",
      values,
    };
  }
}
