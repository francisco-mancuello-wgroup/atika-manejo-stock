import "@atika/ui/globals.css";
import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { Topbar } from "../components/topbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: "atika · Prendas seleccionadas",
  description: "Catálogo de prendas seleccionadas. Consultas por WhatsApp.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-screen">
        <Topbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
