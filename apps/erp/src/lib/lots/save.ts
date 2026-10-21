import type { Prisma } from "@atika/db";
import type { FormState } from "../action-state";
import { recalculateLot } from "./recalculate";
import { parseLotParams } from "./schema";

/** The slice of the Prisma client the save flow needs (lets tests reuse a rolled back tx). */
export interface TransactionRunner {
  $transaction<R>(fn: (tx: Prisma.TransactionClient) => Promise<R>): Promise<R>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates the form, then saves the parameters and reprices the lot in one transaction. */
export async function saveLotParameters(
  db: TransactionRunner,
  lotId: string,
  raw: Record<string, string>,
): Promise<FormState> {
  const parsed = parseLotParams(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: parsed.fieldErrors,
      values: raw,
    };
  }
  if (!UUID.test(lotId))
    return { status: "error", message: "No se encontró el lote.", values: raw };

  const result = await db.$transaction((tx) => recalculateLot(tx, lotId, parsed.data));
  if (!result.ok) return { status: "error", message: "No se encontró el lote.", values: raw };
  return {
    status: "success",
    message: `Parámetros guardados. Se recalcularon ${result.updatedProducts} precios.`,
  };
}
