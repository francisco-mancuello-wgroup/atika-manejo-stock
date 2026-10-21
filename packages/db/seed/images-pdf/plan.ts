import { assignFileNames, slugify } from "../images/slug";
import { type CaptionKind, parseCaptions } from "./captions";
import type { PageLayout } from "./layout";
import { type MatchRule, matchNames } from "./match-names";
import { pairByOrder } from "./pair";

export interface PlanProduct {
  code: string | null;
  name: string;
  brand: string | null;
}

export interface PdfSource {
  pdf: string;
  lotName: string;
  captions: CaptionKind;
  /** Brand words that are part of the workbook name but never of the PDF caption. */
  ignoreTokens?: readonly string[];
  /** Restricts which products of the lot this PDF can describe. */
  includeProduct?: (product: PlanProduct) => boolean;
}

export interface PhotoFile {
  /** Where the extracted image file lives. */
  src: string;
  top: number;
  left: number;
  width: number;
  height: number;
  format: string;
}

export interface PdfPageInput {
  layout: PageLayout;
  /** Product photos of the page; logos are already removed. */
  photos: PhotoFile[];
  logosSkipped: number;
}

export interface PlannedPdfImage {
  productIndex: number;
  code: string | null;
  name: string;
  file: string;
  position: number;
  page: number;
  caption: string;
  rule: MatchRule;
  recreated: boolean;
  photo: PhotoFile;
}

export type UnmatchedReason = "no-caption" | "count-mismatch" | "no-product" | "ambiguous";

export interface UnmatchedPdfImage {
  page: number;
  src: string;
  caption: string | null;
  reason: UnmatchedReason;
  /** Where the export saves this photo: `sin-asignar/<pdf-slug>/p<NN>-<caption>[-n].webp`. */
  file: string;
}

export interface PdfLotPlan {
  lot: string;
  slug: string;
  pdf: string;
  entries: PlannedPdfImage[];
  unmatchedImages: UnmatchedPdfImage[];
  captionsWithoutImage: { page: number; caption: string }[];
  productsWithoutImage: { productIndex: number; name: string }[];
  stats: { imagesFound: number; logosSkipped: number; matched: number; unmatched: number };
}

export const UNASSIGNED_DIR = "sin-asignar";

/** Deterministic names for the photos that match no product, in the order given. */
function unassignedFileNames(
  pdf: string,
  items: readonly { page: number; caption: string | null }[],
): string[] {
  const pdfSlug = slugify(pdf.replace(/\.pdf$/i, ""));
  const used = new Map<string, number>();
  return items.map(({ page, caption }) => {
    const text = caption ? slugify(caption) : "sin-texto";
    const stem = `p${String(page).padStart(2, "0")}-${text}`;
    const count = (used.get(stem) ?? 0) + 1;
    used.set(stem, count);
    return `${UNASSIGNED_DIR}/${pdfSlug}/${count === 1 ? stem : `${stem}-${count}`}.webp`;
  });
}

interface Paired {
  page: number;
  photo: PhotoFile;
  caption: string;
  recreated: boolean;
}

/**
 * Pure: decides which PDF photo goes to which product of the lot. A photo is attached only when its
 * caption names exactly one product; everything else is reported, never assigned.
 */
export function planPdfLot(
  source: PdfSource,
  products: readonly PlanProduct[],
  pages: readonly PdfPageInput[],
): PdfLotPlan {
  const slug = slugify(source.lotName);
  const candidates = products.flatMap((product, productIndex) =>
    source.includeProduct && !source.includeProduct(product)
      ? []
      : [{ productIndex, name: product.name }],
  );

  const paired: Paired[] = [];
  const unmatchedImages: Omit<UnmatchedPdfImage, "file">[] = [];
  const captionsWithoutImage: { page: number; caption: string }[] = [];
  let imagesFound = 0;
  let logosSkipped = 0;

  for (const page of pages) {
    imagesFound += page.photos.length;
    logosSkipped += page.logosSkipped;
    const { captions, recreated } = parseCaptions(page.layout, source.captions);
    const pairing = pairByOrder(page.photos, captions);
    const reason = captions.length === 0 ? "no-caption" : "count-mismatch";
    for (const photo of pairing.unpairedImages) {
      unmatchedImages.push({ page: page.layout.page, src: photo.src, caption: null, reason });
    }
    for (const caption of pairing.unpairedCaptions) {
      captionsWithoutImage.push({ page: page.layout.page, caption: caption.text });
    }
    for (const { image, caption } of pairing.pairs) {
      paired.push({ page: page.layout.page, photo: image, caption: caption.text, recreated });
    }
  }

  const outcomes = matchNames(
    paired.map((p) => p.caption),
    candidates,
    source.ignoreTokens,
  );

  const perProduct = new Map<number, { paired: Paired; rule: MatchRule }[]>();
  for (const [index, item] of paired.entries()) {
    const outcome = outcomes[index];
    if (outcome?.status === "matched") {
      const list = perProduct.get(outcome.productIndex) ?? [];
      list.push({ paired: item, rule: outcome.rule });
      perProduct.set(outcome.productIndex, list);
    } else {
      unmatchedImages.push({
        page: item.page,
        src: item.photo.src,
        caption: item.caption,
        reason: outcome?.status === "ambiguous" ? "ambiguous" : "no-product",
      });
    }
  }

  const files = assignFileNames(
    slug,
    products.map((product, index) => ({
      code: product.code,
      name: product.name,
      images: perProduct.get(index)?.length ?? 0,
    })),
  );

  const entries: PlannedPdfImage[] = [];
  for (const [productIndex, product] of products.entries()) {
    for (const [position, { paired: item, rule }] of (
      perProduct.get(productIndex) ?? []
    ).entries()) {
      const file = files[productIndex]?.[position];
      if (!file) throw new Error(`No file name for product ${productIndex} image ${position}`);
      entries.push({
        productIndex,
        code: product.code,
        name: product.name,
        file,
        position,
        page: item.page,
        caption: item.caption,
        rule,
        recreated: item.recreated,
        photo: item.photo,
      });
    }
  }

  unmatchedImages.sort((a, b) => a.page - b.page);
  const unassignedFiles = unassignedFileNames(source.pdf, unmatchedImages);
  const unassigned = unmatchedImages.map((image, index) => ({
    ...image,
    file: unassignedFiles[index] as string,
  }));
  return {
    lot: source.lotName,
    slug,
    pdf: source.pdf,
    entries,
    unmatchedImages: unassigned,
    captionsWithoutImage,
    productsWithoutImage: candidates
      .filter((c) => !perProduct.has(c.productIndex))
      .map((c) => ({ productIndex: c.productIndex, name: c.name })),
    stats: {
      imagesFound,
      logosSkipped,
      matched: entries.length,
      unmatched: unassigned.length,
    },
  };
}
