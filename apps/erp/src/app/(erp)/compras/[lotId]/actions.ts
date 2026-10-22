"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "../../../../lib/action-state";
import { formValues } from "../../../../lib/action-state";
import { requireSession } from "../../../../lib/auth/session";
import { getDb } from "../../../../lib/db";
import { saveLotParams, setLotPricingMode } from "../../../../lib/lots/pricing-mode";
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

function revalidateLot(lotId: string) {
  revalidatePath("/");
  revalidatePath("/compras");
  revalidatePath(`/compras/${lotId}`);
  revalidatePath("/productos");
  revalidatePath("/parametros");
}

/** "Guardar y recalcular": saves the lot's own pricing values and reprices it. Bound to the lot id. */
export async function saveLotParamsAction(
  lotId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const values = formValues(formData);
  try {
    const state = await saveLotParams(getDb(), lotId, values);
    if (state.status === "success") revalidateLot(lotId);
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

/** Global / Propio switch. Going back to Global copies Parámetros into the lot and reprices it. */
export async function setLotPricingModeAction(
  lotId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const mode = formData.get("mode");
  try {
    const state = await setLotPricingMode(getDb(), lotId, typeof mode === "string" ? mode : "");
    if (state.status === "success") revalidateLot(lotId);
    return state;
  } catch (error) {
    console.error("setLotPricingMode failed", error);
    return {
      status: "error",
      message: "No se pudo cambiar el modo. Intentá de nuevo en unos segundos.",
    };
  }
}
