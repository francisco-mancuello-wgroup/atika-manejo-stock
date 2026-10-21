import "@atika/ui/globals.css";
import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { Topbar } from "../components/topbar";
import { getDb } from "../lib/db";
import { getCatalogSettings } from "../lib/queries";

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

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  title: "atika · Prendas seleccionadas",
  description: "Catálogo de prendas seleccionadas. Consultas por WhatsApp.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="min-h-screen">
        <Topbar whatsappNumber={await loadWhatsappNumber()} />
        <main>{children}</main>
      </body>
    </html>
  );
}
