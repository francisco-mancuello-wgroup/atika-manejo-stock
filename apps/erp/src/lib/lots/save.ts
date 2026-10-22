import type { Prisma } from "@atika/db";
import type { FormState } from "../action-state";
import { parseLotShipping } from "./schema";

/** The slice of the Prisma client the save flow needs (lets tests reuse a rolled back tx). */
export interface TransactionRunner {
  $transaction<R>(fn: (tx: Prisma.TransactionClient) => Promise<R>): Promise<R>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOT_FOUND = "No se encontró el lote.";

/**
 * Validates the form and saves the lot's total shipping (purchase data). It never reprices:
 * prices change only when Parámetros applies its values to the lot.
 */
export async function saveLotShipping(
  db: TransactionRunner,
  lotId: string,
  raw: Record<string, string>,
): Promise<FormState> {
  const parsed = parseLotShipping(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: parsed.fieldErrors,
      values: raw,
    };
  }
  if (!UUID.test(lotId)) return { status: "error", message: NOT_FOUND, values: raw };

  const updated = await db.$transaction((tx) =>
    tx.lot.updateMany({ where: { id: lotId }, data: parsed.data }),
  );
  if (updated.count === 0) return { status: "error", message: NOT_FOUND, values: raw };
  return {
    status: "success",
    message: "Envío guardado. Los precios se actualizan al aplicar desde Parámetros.",
  };
}
