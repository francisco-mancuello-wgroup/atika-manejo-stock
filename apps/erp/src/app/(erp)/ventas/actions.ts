"use server";

import { revalidatePath } from "next/cache";
import { type FormState, formValues } from "../../../lib/action-state";
import { requireSession } from "../../../lib/auth/session";
import { getDb } from "../../../lib/db";
import { registerSaleFromForm } from "../../../lib/sales/register";

export async function registerSaleAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const values = formValues(formData);
  try {
    const { state, lotId } = await registerSaleFromForm(getDb(), values);
    if (state.status === "success") {
      revalidatePath("/ventas");
      revalidatePath("/");
      revalidatePath("/inventario");
      revalidatePath("/compras");
      if (lotId) revalidatePath(`/compras/${lotId}`);
    }
    return state;
  } catch (error) {
    console.error("registerSaleAction failed", error);
    return {
      status: "error",
      message: "No se pudo registrar la venta. Intentá de nuevo en unos segundos.",
      values,
    };
  }
}
