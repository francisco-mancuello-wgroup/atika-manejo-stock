import { z } from "zod";
import { fieldErrors, numberField } from "../form";

const requiredText = (message: string) =>
  z.string({ error: message }).trim().min(1, { error: message });

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const optionalGs = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  numberField("El precio cobrado")
    .pipe(z.number().int({ error: "El precio cobrado debe ser un entero en guaraníes." }))
    .pipe(z.number().min(0, { error: "El precio cobrado no puede ser negativo." }))
    .optional(),
);

/** Checks run even after a failed regex, so this must not throw on malformed input. */
function isRealDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const isoDate = z
  .string({ error: "Elegí la fecha de la venta." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Elegí la fecha de la venta." })
  .refine(isRealDate, { error: "La fecha no es válida." });

export const saleSchema = z.object({
  productId: requiredText("Elegí un producto."),
  size: requiredText("Elegí un talle."),
  quantity: numberField("La cantidad")
    .pipe(z.number().int({ error: "La cantidad debe ser un entero." }))
    .pipe(z.number().min(1, { error: "La cantidad debe ser al menos 1." })),
  soldAt: isoDate,
  chargedGs: optionalGs,
  customer: optionalText,
  notes: optionalText,
});

export type SaleInput = z.output<typeof saleSchema>;

export type ParseSaleResult =
  | { success: true; data: SaleInput }
  | { success: false; fieldErrors: Record<string, string> };

export function parseSale(raw: Record<string, string>): ParseSaleResult {
  const result = saleSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return { success: false, fieldErrors: fieldErrors(result.error.issues) };
}
