import { fileURLToPath } from "node:url";

/** Versioned data derived from the brand PDFs for the category rules, read by the seed. */
export const CATALOG_CATEGORIES_DATA_DIR = fileURLToPath(
  new URL("../../../../data/catalog-categories", import.meta.url),
);

export const CASA_ICONA_LOOKS_FILE = `${CATALOG_CATEGORIES_DATA_DIR}/casa-icona-looks.json`;
