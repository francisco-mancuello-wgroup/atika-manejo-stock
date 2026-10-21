import type { ReactNode } from "react";
import { Topbar } from "../../components/topbar";
import { getDb } from "../../lib/db";
import { getCatalogSettings } from "../../lib/queries";

// The "Escribinos" number is a setting edited from the ERP.
export const dynamic = "force-dynamic";

/** The topbar must still render when the database is unreachable. */
async function loadWhatsappNumber(): Promise<string> {
  try {
    return (await getCatalogSettings(getDb())).whatsappNumber;
  } catch (error) {
    console.error("could not read the catalog settings", error);
    return "";
  }
}

/** Collections index, rows list and product page: they share the site topbar. */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Topbar whatsappNumber={await loadWhatsappNumber()} />
      <main>{children}</main>
    </>
  );
}
