import type { FormState } from "../action-state";
import { countOf } from "../format";
import { parseAppSettings } from "../settings/schema";
import { recalculateLot } from "./recalculate";
import type { TransactionRunner } from "./save";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOT_FOUND = "No se encontró la marca.";

function repriced(count: number): string {
  return `${count === 1 ? "Se recalculó" : "Se recalcularon"} ${countOf(count, "precio", "precios")}.`;
}

/**
 * Saves the lot's own exchange rate, sale factor, IVA and cost share (same parsing as Parámetros)
 * and reprices only that lot. Only a lot in `custom` mode can be edited here; shipping is kept.
 */
export async function saveLotParams(
  db: TransactionRunner,
  lotId: string,
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
  if (!UUID.test(lotId)) return { status: "error", message: NOT_FOUND, values: raw };

  return db.$transaction(async (tx): Promise<FormState> => {
    const lot = await tx.lot.findUnique({
      where: { id: lotId },
      select: { pricingMode: true, totalShippingUsd: true },
    });
    if (!lot) return { status: "error", message: NOT_FOUND, values: raw };
    if (lot.pricingMode !== "custom") {
      return {
        status: "error",
        message: "Esta marca sigue los Parámetros globales. Pasala a Propio para editarla acá.",
        values: raw,
      };
    }
    const result = await recalculateLot(tx, lotId, {
      ...parsed.data,
      totalShippingUsd: lot.totalShippingUsd.toNumber(),
    });
    if (!result.ok) return { status: "error", message: NOT_FOUND, values: raw };
    return {
      status: "success",
      message: `Parámetros propios guardados. ${repriced(result.updatedProducts)}`,
    };
  });
}

/**
 * Switches a lot between following Parámetros (`global`) and using its own values (`custom`).
 * Going `custom` keeps the current values and prices as the starting point; going `global`
 * copies the saved AppSettings into the lot and reprices it.
 */
export async function setLotPricingMode(
  db: TransactionRunner,
  lotId: string,
  mode: string,
): Promise<FormState> {
  if (mode !== "global" && mode !== "custom") {
    return { status: "error", message: "Elegí Global o Propio." };
  }
  if (!UUID.test(lotId)) return { status: "error", message: NOT_FOUND };

  return db.$transaction(async (tx): Promise<FormState> => {
    const lot = await tx.lot.findUnique({
      where: { id: lotId },
      select: { totalShippingUsd: true },
    });
    if (!lot) return { status: "error", message: NOT_FOUND };

    if (mode === "custom") {
      await tx.lot.update({ where: { id: lotId }, data: { pricingMode: "custom" } });
      return {
        status: "success",
        message: "La marca ahora usa parámetros propios. Parámetros ya no la modifica.",
      };
    }

    const settings = await tx.appSettings.findUnique({ where: { id: 1 } });
    if (!settings) {
      return {
        status: "error",
        message: "Todavía no hay Parámetros globales guardados. Guardalos primero en Parámetros.",
      };
    }
    const result = await recalculateLot(tx, lotId, {
      exchangeRate: settings.exchangeRate.toNumber(),
      saleFactor: settings.saleFactor.toNumber(),
      vatRate: settings.vatRate.toNumber(),
      costRate: settings.costRate.toNumber(),
      totalShippingUsd: lot.totalShippingUsd.toNumber(),
    });
    if (!result.ok) return { status: "error", message: NOT_FOUND };
    await tx.lot.update({ where: { id: lotId }, data: { pricingMode: "global" } });
    return {
      status: "success",
      message: `La marca vuelve a seguir los Parámetros globales. ${repriced(result.updatedProducts)}`,
    };
  });
}
