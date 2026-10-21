import "@atika/ui/globals.css";
import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Unbounded } from "next/font/google";
import type { ReactNode } from "react";
import { Sidebar } from "../components/sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
});
const unbounded = Unbounded({ subsets: ["latin"], weight: "300", variable: "--font-unbounded" });

export const metadata: Metadata = {
  title: "atika · Administración",
  description: "Gestión de stock, compras y ventas de atika.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${cormorant.variable} ${unbounded.variable}`}>
      <body className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">{children}</main>
      </body>
    </html>
  );
}
