import { z } from "zod";
import { fieldErrors } from "../form";

const required = (missing: string, max: number) =>
  z
    .string({ error: missing })
    .trim()
    .min(1, { error: missing })
    .max(max, { error: `No puede superar ${max} caracteres.` });

/** Account numbers and RUC: digits, spaces and dashes only (what shoppers copy into their bank). */
const number = (missing: string) =>
  required(missing, 40).regex(/^[\d\s-]+$/, { error: "Usá solo dígitos, espacios y guiones." });

/** The bank account shoppers pay into, shown on the store's /datos-bancarios page. */
export const paymentDetailsSchema = z.object({
  holderName: required("Ingresá la razón social.", 120),
  bank: required("Ingresá el banco.", 60),
  accountGs: number("Ingresá la cuenta en guaraníes."),
  accountUsd: number("Ingresá la cuenta en dólares."),
  ruc: number("Ingresá el RUC."),
});

export type PaymentDetailsInput = z.output<typeof paymentDetailsSchema>;

export function parsePaymentDetails(
  raw: Record<string, string>,
):
  | { success: true; data: PaymentDetailsInput }
  | { success: false; fieldErrors: Record<string, string> } {
  const result = paymentDetailsSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return { success: false, fieldErrors: fieldErrors(result.error.issues) };
}
