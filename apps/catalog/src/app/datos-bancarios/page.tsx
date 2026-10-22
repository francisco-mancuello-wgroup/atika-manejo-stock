import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "../../components/lookbook/icons";
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
      <div className="px-4 pt-4 lg:px-8">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-background/85 px-4 text-xs tracking-[2px] uppercase"
        >
          <ArrowIcon className="size-3.5 rotate-180" />
          Catálogos
        </Link>
      </div>
      <PaymentDetails details={details} />
    </main>
  );
}
