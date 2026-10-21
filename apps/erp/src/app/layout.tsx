import "@atika/ui/globals.css";
import { bodoni, jost } from "@atika/ui/fonts";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "atika · Administración",
  description: "Gestión de stock, compras y ventas de atika.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${jost.variable} ${bodoni.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
