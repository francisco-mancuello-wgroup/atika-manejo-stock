import type { StaticImageData } from "next/image";
import casaIcona from "../../public/atika/covers/casa-icona.jpg";
import milonga from "../../public/atika/covers/milonga.jpg";
import sordo from "../../public/atika/covers/sordo.jpg";
import type { CatalogSlug } from "./lookbook";

/** Cover photo of each lookbook, taken from page 1 of its PDF. */
export const CATALOG_COVERS: Record<CatalogSlug, StaticImageData> = {
  "casa-icona": casaIcona,
  milonga,
  sordo,
};
