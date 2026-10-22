import { getDb } from "../db";

export interface PaymentDetailsView {
  holderName: string;
  bank: string;
  accountGs: string;
  accountUsd: string;
  ruc: string;
}

/** The saved bank details, or null when they were never loaded. */
export async function getPaymentDetails(): Promise<PaymentDetailsView | null> {
  return getDb().paymentDetails.findUnique({
    where: { id: 1 },
    select: { holderName: true, bank: true, accountGs: true, accountUsd: true, ruc: true },
  });
}
