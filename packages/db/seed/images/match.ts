export interface SheetImage {
  /** Spreadsheet row (1-based) of the drawing's top-left anchor. */
  row: number;
  /** Spreadsheet column (1-based) of the drawing's top-left anchor. */
  col: number;
  /** Workbook media id; two drawings with the same id show the same picture. */
  imageId: number;
  extension: string;
  buffer: Buffer;
}

export interface ImageMatch {
  productIndex: number;
  image: SheetImage;
}

export interface MatchResult {
  /** Ordered by product, then row. */
  matches: ImageMatch[];
  /** Images anchored on a row that no product was read from (headers, blanks, totals). */
  unmatched: SheetImage[];
  /** Indexes of products that received no image. */
  withoutImage: number[];
}

/**
 * Assigns each image to the product whose source rows contain the image's anchor row. Exact only:
 * an image anchored anywhere else is reported, never attached to the nearest product.
 */
export function matchImages(
  products: readonly { sourceRows: readonly number[] }[],
  images: readonly SheetImage[],
): MatchResult {
  const owner = new Map<number, number>();
  for (const [index, product] of products.entries()) {
    for (const row of product.sourceRows) owner.set(row, index);
  }

  const matches: ImageMatch[] = [];
  const unmatched: SheetImage[] = [];
  const seen = new Set<string>();
  for (const image of images) {
    const productIndex = owner.get(image.row);
    if (productIndex === undefined) {
      unmatched.push(image);
      continue;
    }
    const key = `${productIndex}|${image.imageId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push({ productIndex, image });
  }
  matches.sort((a, b) => a.productIndex - b.productIndex || a.image.row - b.image.row);

  const matched = new Set(matches.map((m) => m.productIndex));
  const withoutImage = products.flatMap((_, index) => (matched.has(index) ? [] : [index]));
  return { matches, unmatched, withoutImage };
}
