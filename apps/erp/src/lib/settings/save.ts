import type { FormState } from "../action-state";
import { countOf } from "../format";
import { recalculateLot } from "../lots/recalculate";
import type { TransactionRunner } from "../lots/save";
import { parseAppSettings } from "./schema";

/**
 * Validates the form, stores the singleton settings row (percentages become fractions) and, in
 * the same transaction, writes the saved exchange rate, sale factor, IVA and cost share into every
 * `global` lot and reprices their products. Only the shipping comes from each lot (purchase data).
 * Lots with their own parameters (`custom`) are left untouched.
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

    const lots = await tx.lot.findMany({
      where: { pricingMode: "global" },
      select: { id: true, totalShippingUsd: true },
    });
    const untouched = await tx.lot.count({ where: { pricingMode: "custom" } });
    let products = 0;
    for (const lot of lots) {
      const result = await recalculateLot(tx, lot.id, {
        ...settings,
        totalShippingUsd: lot.totalShippingUsd.toNumber(),
      });
      if (result.ok) products += result.updatedProducts;
    }
    return { lots: lots.length, products, untouched };
  });

  return {
    status: "success",
    message: `Parámetros guardados. ${outcome.lots === 1 ? "Se actualizó" : "Se actualizaron"} ${countOf(outcome.lots, "marca", "marcas")} y ${outcome.products === 1 ? "se recalculó" : "se recalcularon"} ${countOf(outcome.products, "precio", "precios")}.${untouchedNote(outcome.untouched)}`,
  };
}

function untouchedNote(count: number): string {
  if (count === 0) return "";
  return count === 1
    ? " 1 marca con parámetros propios no se modificó."
    : ` ${count} marcas con parámetros propios no se modificaron.`;
}
