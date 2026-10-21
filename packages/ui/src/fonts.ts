import localFont from "next/font/local";

// Self-hosted (SIL Open Font License 1.1, files in ./fonts) so dev and builds never depend on
// Google Fonts being reachable. Both are variable fonts; latin subset covers Spanish.

/** Interface and body text. */
export const jost = localFont({
  src: "./fonts/jost-latin.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-jost",
});

/** Display text only (titles, prices) at 20px and above. */
export const bodoni = localFont({
  src: "./fonts/bodoni-moda-latin.woff2",
  weight: "400 900",
  display: "swap",
  variable: "--font-bodoni",
});
