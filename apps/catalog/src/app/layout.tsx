import "./lookbook.css";
import { bodoni, jost } from "@atika/ui/fonts";
import type { Metadata } from "next";
import { Quattrocento_Sans, Trirong } from "next/font/google";
import type { ReactNode } from "react";

// Settings and products change from the ERP at any time.
export const dynamic = "force-dynamic";

// Atika lookbook fonts (atika.com.py): Trirong Light headings, Quattrocento Sans text
const trirong = Trirong({ subsets: ["latin"], weight: "300", variable: "--font-trirong" });
const quattrocento = Quattrocento_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-quattrocento",
});

export const metadata: Metadata = {
  title: "Átika – Atika Official",
  description:
    "Tienda oficial de Átika: Casa Icona, Milonga y Sordo. Elegí tus prendas y pagá por WhatsApp.",
};

/** Document shell only: the site topbar lives in `(site)`, the presentation pages have none. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es"
      className={`${jost.variable} ${bodoni.variable} ${trirong.variable} ${quattrocento.variable}`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
