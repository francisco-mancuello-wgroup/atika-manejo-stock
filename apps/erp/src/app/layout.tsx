import "@atika/ui/globals.css";
import { bodoni, jost } from "@atika/ui/fonts";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sidebar } from "../components/sidebar";
import { getExchangeRateOrUndefined } from "../lib/queries/settings";

// The sidebar reads the exchange rate of the day from the database.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "atika · Administración",
  description: "Gestión de stock, compras y ventas de atika.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${jost.variable} ${bodoni.variable}`}>
      <body className="flex min-h-screen">
        <Sidebar exchangeRate={await getExchangeRateOrUndefined()} />
        <main className="flex-1 p-8">{children}</main>
      </body>
    </html>
  );
}
