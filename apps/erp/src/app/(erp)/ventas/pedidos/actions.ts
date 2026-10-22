"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "../../../../lib/action-state";
import { requireSession } from "../../../../lib/auth/session";
import { getDb } from "../../../../lib/db";
import {
  approveOrder,
  approveState,
  rejectOrder,
  rejectState,
} from "../../../../lib/orders/decide";

const FAILED: FormState = {
  status: "error",
  message: "No se pudo completar. Intentá de nuevo en unos segundos.",
};

function revalidateOrder(id: string) {
  revalidatePath("/ventas/pedidos");
  revalidatePath(`/ventas/pedidos/${id}`);
}

/** "Aprobar": registers every line as a sale (all or nothing) and marks the order approved. */
export async function approveOrderAction(orderId: string): Promise<FormState> {
  await requireSession();
  try {
    const result = await approveOrder(getDb(), orderId);
    revalidateOrder(orderId);
    if (result.ok) {
      revalidatePath("/ventas");
      revalidatePath("/");
      revalidatePath("/inventario");
      revalidatePath("/compras");
      for (const lotId of result.lotIds) revalidatePath(`/compras/${lotId}`);
    }
    return approveState(result);
  } catch (error) {
    console.error("approveOrderAction failed", error);
    return FAILED;
  }
}

/** "Rechazar": marks the order rejected; stock is untouched. */
export async function rejectOrderAction(orderId: string): Promise<FormState> {
  await requireSession();
  try {
    const result = await rejectOrder(getDb(), orderId);
    revalidateOrder(orderId);
    return rejectState(result);
  } catch (error) {
    console.error("rejectOrderAction failed", error);
    return FAILED;
  }
}
