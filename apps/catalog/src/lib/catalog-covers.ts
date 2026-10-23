import type { StaticImageData } from "next/image";
import casaIcona from "../../public/atika/covers/casa-icona.jpg";
import milonga from "../../public/atika/covers/milonga.jpg";
import sordo from "../../public/atika/covers/sordo.jpg";
import pink from "../../public/atika/pink.jpg";
import type { BookCatalog } from "../components/lookbook/book";
import { brandCover, brandTagline, type LookbookPage } from "./lookbook";
import type { LookbookBrand } from "./queries";

/**
 * Static cover photos by brand slug: page 1 of the original three PDFs, and the Pink banner photo
 * for Otras marcas. Any other brand uses its uploaded cover or the first photo of its lookbook.
 */
const STATIC_COVERS: Record<string, StaticImageData> = {
  "casa-icona": casaIcona,
  milonga,
  sordo,
  "otras-marcas": pink,
};

/** A brand as the book renders it; `pages` overrides the brand's own (Pink shows only some). */
export function toBookCatalog(
  brand: LookbookBrand,
  pages: LookbookPage[] = brand.pages,
): BookCatalog {
  return {
    slug: brand.slug,
    name: brand.name,
    tagline: brandTagline(brand.slug),
    cover: brandCover(brand.coverUrl, STATIC_COVERS[brand.slug], brand.pages),
    pages,
  };
}
