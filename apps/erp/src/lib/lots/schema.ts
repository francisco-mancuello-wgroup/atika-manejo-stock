import { z } from "zod";
import { fieldErrors, numberField, roundTo } from "../form";

/** Compras only edits the shipping paid for the lot; every pricing value lives in Parámetros. */
export const lotShippingSchema = z
  .object({
    totalShippingUsd: numberField("El envío").pipe(
      z.number().min(0, { error: "El envío no puede ser negativo." }),
    ),
  })
  .transform((values) => ({ totalShippingUsd: roundTo(values.totalShippingUsd, 2) }));

export type LotShippingInput = z.output<typeof lotShippingSchema>;

export type ParseLotShippingResult =
  | { success: true; data: LotShippingInput }
  | { success: false; fieldErrors: Record<string, string> };

export function parseLotShipping(raw: Record<string, string>): ParseLotShippingResult {
  const result = lotShippingSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return { success: false, fieldErrors: fieldErrors(result.error.issues) };
}
