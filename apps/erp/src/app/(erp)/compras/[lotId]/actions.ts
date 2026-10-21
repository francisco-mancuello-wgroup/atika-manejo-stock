"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "../../../../lib/action-state";
import { formValues } from "../../../../lib/action-state";
import { getDb } from "../../../../lib/db";
import { saveLotParameters } from "../../../../lib/lots/save";

/** "Guardar y recalcular": bound to the lot id by the page (`saveLotParams.bind(null, id)`). */
export async function saveLotParams(
  lotId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  try {
    const state = await saveLotParameters(getDb(), lotId, values);
    if (state.status === "success") {
      revalidatePath("/");
      revalidatePath("/inventario");
      revalidatePath("/compras");
      revalidatePath(`/compras/${lotId}`);
    }
    return state;
  } catch (error) {
    console.error("saveLotParams failed", error);
    return {
      status: "error",
      message: "No se pudo guardar. Intentá de nuevo en unos segundos.",
      values,
    };
  }
}
