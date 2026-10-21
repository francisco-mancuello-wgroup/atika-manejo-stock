import { z } from "zod";
import { fieldErrors, numberField, percentField, roundTo } from "../form";

/** Form values use percentages (10); the database stores fractions (0.1). */
export const lotParamsSchema = z
  .object({
    exchangeRate: numberField("El tipo de cambio").pipe(
      z.number().positive({ error: "El tipo de cambio debe ser mayor que 0." }),
    ),
    saleFactor: numberField("El factor de venta").pipe(
      z.number().positive({ error: "El factor de venta debe ser mayor que 0." }),
    ),
    vatPercent: percentField("El IVA"),
    costPercent: percentField("El costo"),
    totalShippingUsd: numberField("El envío").pipe(
      z.number().min(0, { error: "El envío no puede ser negativo." }),
    ),
  })
  .transform((values) => ({
    exchangeRate: roundTo(values.exchangeRate, 2),
    saleFactor: roundTo(values.saleFactor, 3),
    vatRate: roundTo(values.vatPercent / 100, 4),
    costRate: roundTo(values.costPercent / 100, 4),
    totalShippingUsd: roundTo(values.totalShippingUsd, 2),
  }));

export type LotParamsInput = z.output<typeof lotParamsSchema>;

export type ParseLotParamsResult =
  | { success: true; data: LotParamsInput }
  | { success: false; fieldErrors: Record<string, string> };

export function parseLotParams(raw: Record<string, string>): ParseLotParamsResult {
  const result = lotParamsSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return { success: false, fieldErrors: fieldErrors(result.error.issues) };
}
