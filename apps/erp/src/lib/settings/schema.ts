import { z } from "zod";
import { fieldErrors, numberField, percentField, roundTo } from "../form";

export const SCOPES = ["new", "selected", "all"] as const;
export type SettingsScope = (typeof SCOPES)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    scope: z.enum(SCOPES, { error: "Elegí a qué lotes aplicar los valores." }).default("new"),
    lotIds: z
      .array(z.string().regex(UUID, { error: "Alguno de los lotes elegidos no existe." }))
      .default([]),
  })
  .superRefine((values, ctx) => {
    if (values.scope === "selected" && values.lotIds.length === 0) {
      ctx.addIssue({ code: "custom", path: ["lotIds"], message: "Elegí al menos un lote." });
    }
  })
  .transform((values) => ({
    exchangeRate: roundTo(values.exchangeRate, 2),
    saleFactor: roundTo(values.saleFactor, 3),
    vatRate: roundTo(values.vatPercent / 100, 4),
    costRate: roundTo(values.costPercent / 100, 4),
    scope: values.scope,
    // Only the selected scope targets specific lots; duplicates collapse.
    lotIds: values.scope === "selected" ? [...new Set(values.lotIds)] : [],
  }));

export type AppSettingsInput = z.output<typeof appSettingsSchema>;

export type ParseAppSettingsResult =
  | { success: true; data: AppSettingsInput }
  | { success: false; fieldErrors: Record<string, string> };

/** `lotIds` come from the repeated `lotIds` form field, which `formValues` cannot carry. */
export function parseAppSettings(
  raw: Record<string, string>,
  lotIds: readonly string[] = [],
): ParseAppSettingsResult {
  const result = appSettingsSchema.safeParse({ ...raw, lotIds });
  if (result.success) return { success: true, data: result.data };
  return { success: false, fieldErrors: fieldErrors(result.error.issues) };
}
