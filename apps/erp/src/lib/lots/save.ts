import type { Prisma } from "@atika/db";
import type { FormState } from "../action-state";
import { countOf } from "../format";
import { recalculateLot } from "./recalculate";
import { parseLotShipping } from "./schema";

/** The slice of the Prisma client the save flow needs (lets tests reuse a rolled back tx). */
export interface TransactionRunner {
  $transaction<R>(fn: (tx: Prisma.TransactionClient) => Promise<R>): Promise<R>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOT_FOUND = "No se encontró la marca.";

/**
 * Validates the form, saves the lot's total shipping (purchase data) and reprices the lot with
 * the parameters it already has (global copy or its own), so shipping changes reach the catalog.
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

  const updatedProducts = await db.$transaction(async (tx) => {
    const lot = await tx.lot.findUnique({
      where: { id: lotId },
      select: { exchangeRate: true, saleFactor: true, vatRate: true, costRate: true },
    });
    if (!lot) return null;
    const result = await recalculateLot(tx, lotId, {
      exchangeRate: lot.exchangeRate.toNumber(),
      saleFactor: lot.saleFactor.toNumber(),
      vatRate: lot.vatRate.toNumber(),
      costRate: lot.costRate.toNumber(),
      totalShippingUsd: parsed.data.totalShippingUsd,
    });
    return result.ok ? result.updatedProducts : null;
  });
  if (updatedProducts === null) return { status: "error", message: NOT_FOUND, values: raw };
  return {
    status: "success",
    message: `Envío guardado. ${updatedProducts === 1 ? "Se recalculó" : "Se recalcularon"} ${countOf(updatedProducts, "precio", "precios")}.`,
  };
}
