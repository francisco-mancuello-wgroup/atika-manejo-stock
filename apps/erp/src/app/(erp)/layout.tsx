import type { ReactNode } from "react";
import { CurrencyToggle } from "../../components/currency-toggle";
import { Sidebar } from "../../components/sidebar";
import { requireSession } from "../../lib/auth/session";
import { getCurrencyDisplay } from "../../lib/display-currency";
import { setCurrencyAction } from "./moneda/actions";

// The sidebar reads the exchange rate and the session from the database.
export const dynamic = "force-dynamic";

/** Authenticated area: the session is validated server-side before anything renders. */
export default async function ErpLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const display = await getCurrencyDisplay();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar email={session.email} exchangeRate={display.exchangeRate} />
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8">
        <div className="flex justify-end">
          <CurrencyToggle
            currency={display.currency}
            canUseUsd={display.exchangeRate !== undefined}
            action={setCurrencyAction}
          />
        </div>
        {children}
      </main>
    </div>
  );
}
