import { z } from "zod";
import { checkbox, fieldErrors, numberField, optionalDate } from "../form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DISCOUNT_SCOPES = ["all", "selected"] as const;

export const discountSchema = z
  .object({
    name: z
      .string({ error: "Escribí el nombre del descuento." })
      .trim()
      .min(1, { error: "Escribí el nombre del descuento." })
      .max(80, { error: "El nombre no puede superar 80 caracteres." }),
    percent: numberField("El porcentaje")
      .pipe(z.number().int({ error: "El porcentaje debe ser un número entero." }))
      .pipe(z.number().min(1, { error: "El porcentaje debe ser al menos 1." }))
      .pipe(z.number().max(90, { error: "El porcentaje no puede superar 90." })),
    isActive: checkbox,
    startsAt: optionalDate("Elegí una fecha válida."),
    endsAt: optionalDate("Elegí una fecha válida."),
    scope: z.enum(DISCOUNT_SCOPES, { error: "Elegí a qué productos se aplica." }),
  })
  .refine((value) => !value.startsAt || !value.endsAt || value.endsAt >= value.startsAt, {
    path: ["endsAt"],
    error: "La fecha de fin no puede ser anterior a la de inicio.",
  });

export type DiscountInput = z.output<typeof discountSchema> & { productIds: string[] };

export type ParseDiscountResult =
  | { success: true; data: DiscountInput }
  | { success: false; fieldErrors: Record<string, string> };

/** Form fields plus the picked product ids (repeated form entries, read by the action). */
export function parseDiscount(
  raw: Record<string, string>,
  productIds: readonly string[],
): ParseDiscountResult {
  const result = discountSchema.safeParse(raw);
  if (!result.success) return { success: false, fieldErrors: fieldErrors(result.error.issues) };
  const ids =
    result.data.scope === "selected" ? [...new Set(productIds.filter((id) => UUID.test(id)))] : [];
  if (result.data.scope === "selected" && ids.length === 0) {
    return { success: false, fieldErrors: { productIds: "Elegí al menos un producto." } };
  }
  return { success: true, data: { ...result.data, productIds: ids } };
}
