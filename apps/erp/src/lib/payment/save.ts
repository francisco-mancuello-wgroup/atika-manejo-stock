import type { FormState } from "../action-state";
import type { TransactionRunner } from "../lots/save";
import { parsePaymentDetails } from "./schema";

/** Saves the bank details (single row, id = 1). The QR points to a page, so it never changes. */
export async function savePaymentDetails(
  db: TransactionRunner,
  raw: Record<string, string>,
): Promise<FormState> {
  const parsed = parsePaymentDetails(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: parsed.fieldErrors,
      values: raw,
    };
  }
  await db.$transaction((tx) =>
    tx.paymentDetails.upsert({
      where: { id: 1 },
      create: { id: 1, ...parsed.data },
      update: parsed.data,
    }),
  );
  return { status: "success", message: "Datos bancarios guardados." };
}
