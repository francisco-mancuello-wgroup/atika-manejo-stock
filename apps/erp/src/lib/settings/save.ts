import type { FormState } from "../action-state";
import { recalculateLot } from "../lots/recalculate";
import type { TransactionRunner } from "../lots/save";
import { parseAppSettings } from "./schema";

const UNKNOWN_LOTS = "Alguno de los lotes elegidos no existe.";

/**
 * Validates the form, stores the singleton settings row (percentages become fractions) and, in
 * the same transaction, writes the saved sale factor and IVA into the targeted lots and reprices
 * their products. Each lot keeps its own exchange rate, cost share and shipping.
 */
export async function saveAndApplySettings(
  db: TransactionRunner,
  raw: Record<string, string>,
  lotIds: readonly string[] = [],
): Promise<FormState> {
  const parsed = parseAppSettings(raw, lotIds);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: parsed.fieldErrors,
      values: raw,
    };
  }
  const { scope, lotIds: selected, ...settings } = parsed.data;

  const outcome = await db.$transaction(async (tx) => {
    const targets =
      scope === "all"
        ? (await tx.lot.findMany({ select: { id: true } })).map((lot) => lot.id)
        : selected;
    if (scope === "selected") {
      const found = await tx.lot.count({ where: { id: { in: targets } } });
      if (found !== targets.length) return null;
    }

    await tx.appSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...settings },
      update: settings,
    });

    let products = 0;
    for (const id of targets) {
      const lot = await tx.lot.findUniqueOrThrow({ where: { id } });
      const result = await recalculateLot(tx, id, {
        exchangeRate: lot.exchangeRate.toNumber(),
        saleFactor: settings.saleFactor,
        vatRate: settings.vatRate,
        costRate: lot.costRate.toNumber(),
        totalShippingUsd: lot.totalShippingUsd.toNumber(),
      });
      if (result.ok) products += result.updatedProducts;
    }
    return { lots: targets.length, products };
  });

  if (!outcome) {
    return {
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: { lotIds: UNKNOWN_LOTS },
      values: raw,
    };
  }
  if (scope === "new") return { status: "success", message: "Parámetros guardados." };
  return {
    status: "success",
    message: `Parámetros guardados. Se actualizaron ${outcome.lots} lotes y se recalcularon ${outcome.products} precios.`,
  };
}
