import type { FormState } from "../action-state";
import { recalculateLot } from "../lots/recalculate";
import type { TransactionRunner } from "../lots/save";
import { parseAppSettings } from "./schema";

/** Validates the form and stores the singleton settings row (percentages become fractions). */
export async function saveAppSettings(
  db: TransactionRunner,
  raw: Record<string, string>,
): Promise<FormState> {
  const parsed = parseAppSettings(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: parsed.fieldErrors,
      values: raw,
    };
  }
  await db.$transaction((tx) =>
    tx.appSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...parsed.data },
      update: parsed.data,
    }),
  );
  return { status: "success", message: "Parámetros guardados." };
}

/**
 * Writes the saved sale factor and IVA to every lot and reprices all their products in one
 * transaction. Each lot keeps its own exchange rate, cost share and shipping.
 */
export async function applySettingsToAllLots(db: TransactionRunner): Promise<FormState> {
  const outcome = await db.$transaction(async (tx) => {
    const settings = await tx.appSettings.findUnique({ where: { id: 1 } });
    if (!settings) return null;
    const lots = await tx.lot.findMany({ select: { id: true } });
    let products = 0;
    for (const { id } of lots) {
      const lot = await tx.lot.findUniqueOrThrow({ where: { id } });
      const result = await recalculateLot(tx, id, {
        exchangeRate: lot.exchangeRate.toNumber(),
        saleFactor: settings.saleFactor.toNumber(),
        vatRate: settings.vatRate.toNumber(),
        costRate: lot.costRate.toNumber(),
        totalShippingUsd: lot.totalShippingUsd.toNumber(),
      });
      if (result.ok) products += result.updatedProducts;
    }
    return { lots: lots.length, products };
  });
  if (!outcome) {
    return { status: "error", message: "Guardá los parámetros antes de aplicarlos." };
  }
  return {
    status: "success",
    message: `Se actualizaron ${outcome.lots} lotes y se recalcularon ${outcome.products} precios.`,
  };
}
