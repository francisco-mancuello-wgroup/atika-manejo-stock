import type { FormState } from "../action-state";
import { countOf } from "../format";
import { recalculateLot } from "../lots/recalculate";
import type { TransactionRunner } from "../lots/save";
import { parseAppSettings } from "./schema";

/**
 * Validates the form, stores the singleton settings row (percentages become fractions) and, in
 * the same transaction, writes the saved exchange rate, sale factor, IVA and cost share into every
 * lot and reprices their products. Only the shipping comes from each lot (purchase data).
 */
export async function saveAndApplySettings(
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
  const settings = parsed.data;

  const outcome = await db.$transaction(async (tx) => {
    await tx.appSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...settings },
      update: settings,
    });

    const lots = await tx.lot.findMany({ select: { id: true, totalShippingUsd: true } });
    let products = 0;
    for (const lot of lots) {
      const result = await recalculateLot(tx, lot.id, {
        ...settings,
        totalShippingUsd: lot.totalShippingUsd.toNumber(),
      });
      if (result.ok) products += result.updatedProducts;
    }
    return { lots: lots.length, products };
  });

  return {
    status: "success",
    message: `Parámetros guardados. ${outcome.lots === 1 ? "Se actualizó" : "Se actualizaron"} ${countOf(outcome.lots, "lote", "lotes")} y ${outcome.products === 1 ? "se recalculó" : "se recalcularon"} ${countOf(outcome.products, "precio", "precios")}.`,
  };
}
