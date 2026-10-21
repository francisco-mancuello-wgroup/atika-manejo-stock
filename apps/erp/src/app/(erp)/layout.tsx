import type { ReactNode } from "react";
import { Sidebar } from "../../components/sidebar";
import { requireSession } from "../../lib/auth/session";
import { getExchangeRateOrUndefined } from "../../lib/queries/settings";

// The sidebar reads the exchange rate and the session from the database.
export const dynamic = "force-dynamic";

/** Authenticated area: the session is validated server-side before anything renders. */
export default async function ErpLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  return (
    <div className="flex min-h-screen">
      <Sidebar email={session.email} exchangeRate={await getExchangeRateOrUndefined()} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
