import "@atika/ui/globals.css";
import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Unbounded } from "next/font/google";
import type { ReactNode } from "react";
import { Topbar } from "../components/topbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
});
const unbounded = Unbounded({ subsets: ["latin"], weight: "300", variable: "--font-unbounded" });

export const metadata: Metadata = {
  title: "atika · Prendas seleccionadas",
  description: "Catálogo de prendas seleccionadas. Consultas por WhatsApp.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${cormorant.variable} ${unbounded.variable}`}>
      <body className="min-h-screen">
        <Topbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
