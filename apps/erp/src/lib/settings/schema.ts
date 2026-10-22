import { z } from "zod";
import { fieldErrors, numberField, percentField, roundTo } from "../form";

/** Form values use percentages (10); the database stores fractions (0.1). */
export const appSettingsSchema = z
  .object({
    exchangeRate: numberField("El tipo de cambio").pipe(
      z.number().positive({ error: "El tipo de cambio debe ser mayor que 0." }),
    ),
    saleFactor: numberField("El factor de venta").pipe(
      z.number().positive({ error: "El factor de venta debe ser mayor que 0." }),
    ),
    vatPercent: percentField("El IVA"),
    costPercent: percentField("El costo"),
  })
  .transform((values) => ({
    exchangeRate: roundTo(values.exchangeRate, 2),
    saleFactor: roundTo(values.saleFactor, 3),
    vatRate: roundTo(values.vatPercent / 100, 4),
    costRate: roundTo(values.costPercent / 100, 4),
  }));

export type AppSettingsInput = z.output<typeof appSettingsSchema>;

export type ParseAppSettingsResult =
  | { success: true; data: AppSettingsInput }
  | { success: false; fieldErrors: Record<string, string> };

export function parseAppSettings(raw: Record<string, string>): ParseAppSettingsResult {
  const result = appSettingsSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return { success: false, fieldErrors: fieldErrors(result.error.issues) };
}
