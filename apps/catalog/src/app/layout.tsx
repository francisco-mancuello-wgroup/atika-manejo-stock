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

const DESCRIPTION =
  "Tienda oficial de Átika: Casa Icona, Milonga y Sordo. Elegí tus prendas y pagá por WhatsApp.";

export const metadata: Metadata = {
  // Share previews (WhatsApp, Instagram) need absolute URLs for `opengraph-image.png`
  metadataBase: new URL(process.env.SITE_URL ?? "https://atika-event.vercel.app"),
  title: "Átika – Atika Official",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Átika",
    locale: "es_PY",
    title: "Átika – Atika Official",
    description: DESCRIPTION,
  },
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
