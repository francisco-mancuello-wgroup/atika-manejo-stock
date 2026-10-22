"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "../../../../lib/action-state";
import { formValues } from "../../../../lib/action-state";
import { requireSession } from "../../../../lib/auth/session";
import { getDb } from "../../../../lib/db";
import { saveLotShipping } from "../../../../lib/lots/save";

/** "Guardar envío": saves only the shipping, never reprices. Bound to the lot id by the page. */
export async function saveLotShippingAction(
  lotId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const values = formValues(formData);
  try {
    const state = await saveLotShipping(getDb(), lotId, values);
    if (state.status === "success") {
      revalidatePath("/");
      revalidatePath("/compras");
      revalidatePath(`/compras/${lotId}`);
    }
    return state;
  } catch (error) {
    console.error("saveLotShipping failed", error);
    return {
      status: "error",
      message: "No se pudo guardar. Intentá de nuevo en unos segundos.",
      values,
    };
  }
}
