import type { Metadata } from "next";
import { PaymentDetails } from "../../components/payment-details";
import { getDb } from "../../lib/db";
import { getPaymentDetails } from "../../lib/queries";

// The details change from the ERP at any time; the printed QR always opens this page.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Datos bancarios · Átika" };

/** `/datos-bancarios`: the bank account to pay by transfer, opened by the printed QR. */
export default async function DatosBancariosPage() {
  const details = await getPaymentDetails(getDb());
  return (
    <main className="min-h-svh">
      <PaymentDetails details={details} />
    </main>
  );
}
