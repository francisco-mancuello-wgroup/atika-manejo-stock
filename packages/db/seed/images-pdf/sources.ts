import type { PdfSource } from "./plan";

/**
 * The brand PDFs and the lot each one describes. Captions are matched only against products of
 * that lot (and, for Sordo, only against the Sordo products of the Átika lot).
 */
export const PDF_SOURCES: readonly PdfSource[] = [
  { pdf: "atika.pdf", lotName: "Casa Icona", captions: "numbered-looks" },
  {
    pdf: "Atika-Catalogo-Aros.pdf",
    lotName: "Átika",
    captions: "sections",
    ignoreTokens: ["sordo"],
    includeProduct: (product) => product.brand === "Sordo",
  },
  // Pages only carry section titles ("Vestidos", ...): no product name, so nothing can be matched.
  { pdf: "Atika_Milonga_Catalogo_Editorial.pdf", lotName: "Milonga", captions: "none" },
];
