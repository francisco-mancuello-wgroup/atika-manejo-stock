import { z } from "zod";
import { fieldErrors } from "../form";

export const bankSchema = z.object({
  name: z
    .string({ error: "Escribí el nombre del banco." })
    .trim()
    .min(1, { error: "Escribí el nombre del banco." })
    .max(60, { error: "El nombre no puede superar 60 caracteres." }),
});

export type BankInput = z.output<typeof bankSchema>;

export type ParseBankResult =
  | { success: true; data: BankInput }
  | { success: false; fieldErrors: Record<string, string> };

export function parseBank(raw: Record<string, string>): ParseBankResult {
  const result = bankSchema.safeParse(raw);
  if (!result.success) return { success: false, fieldErrors: fieldErrors(result.error.issues) };
  return { success: true, data: result.data };
}
