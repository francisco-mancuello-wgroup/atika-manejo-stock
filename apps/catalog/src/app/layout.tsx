import "@atika/ui/globals.css";
import { bodoni, jost } from "@atika/ui/fonts";
import type { Metadata } from "next";
import type { ReactNode } from "react";

// Settings and products change from the ERP at any time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "atika · Prendas seleccionadas",
  description: "Catálogo de prendas seleccionadas. Consultas por WhatsApp.",
};

/** Document shell only: the site topbar lives in `(site)`, the presentation pages have none. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${jost.variable} ${bodoni.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
