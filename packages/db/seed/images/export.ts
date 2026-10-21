import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { MANIFEST_VERSION, type Manifest, type ManifestImage, type ManifestLot } from "./manifest";
import { type ImageMatch, matchImages, type SheetImage } from "./match";
import { type OptimizedImage, optimizeImage } from "./optimize";
import { assignFileNames, slugify } from "./slug";

export interface PlannedImage {
  productIndex: number;
  code: string | null;
  name: string;
  file: string;
  position: number;
  sourceRow: number;
  image: SheetImage;
}

export interface LotImagePlan {
  lot: string;
  slug: string;
  entries: PlannedImage[];
  unmatchedImages: { row: number; col: number }[];
  productsWithoutImage: { productIndex: number; name: string }[];
}

interface PlannedProduct {
  code: string | null;
  name: string;
  sourceRows: number[];
}

/** Pure: decides which image goes to which product and what each file is called. */
export function planLotImages(
  lotName: string,
  products: readonly PlannedProduct[],
  images: readonly SheetImage[],
): LotImagePlan {
  const slug = slugify(lotName);
  const { matches, unmatched, withoutImage } = matchImages(products, images);

  const perProduct = new Map<number, ImageMatch[]>();
  for (const match of matches) {
    perProduct.set(match.productIndex, [...(perProduct.get(match.productIndex) ?? []), match]);
  }
  const files = assignFileNames(
    slug,
    products.map((p, index) => ({
      code: p.code,
      name: p.name,
      images: perProduct.get(index)?.length ?? 0,
    })),
  );

  const entries: PlannedImage[] = [];
  for (const [productIndex, product] of products.entries()) {
    for (const [position, match] of (perProduct.get(productIndex) ?? []).entries()) {
      const file = files[productIndex]?.[position];
      if (!file) throw new Error(`No file name for product ${productIndex} image ${position}`);
      entries.push({
        productIndex,
        code: product.code,
        name: product.name,
        file,
        position,
        sourceRow: match.image.row,
        image: match.image,
      });
    }
  }

  return {
    lot: lotName,
    slug,
    entries,
    unmatchedImages: unmatched.map(({ row, col }) => ({ row, col })),
    productsWithoutImage: withoutImage.map((productIndex) => ({
      productIndex,
      name: products[productIndex]?.name ?? "",
    })),
  };
}

/**
 * Empties `outDir`, writes every optimized image and `manifest.json`, and returns the manifest.
 * The output depends only on the plans, so re-running on the same workbooks yields the same bytes.
 */
export async function writeExport(
  outDir: string,
  plans: readonly LotImagePlan[],
  optimize: (source: Buffer) => Promise<OptimizedImage> = optimizeImage,
): Promise<Manifest> {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const lots: ManifestLot[] = [];
  for (const plan of plans) {
    const images: ManifestImage[] = [];
    for (const entry of plan.entries) {
      const optimized = await optimize(entry.image.buffer);
      const target = join(outDir, entry.file);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, optimized.data);
      images.push({
        productIndex: entry.productIndex,
        code: entry.code,
        name: entry.name,
        file: entry.file,
        position: entry.position,
        sourceRow: entry.sourceRow,
        sourceFormat: entry.image.extension,
        width: optimized.width,
        height: optimized.height,
        bytes: optimized.data.length,
        sourceBytes: entry.image.buffer.length,
      });
    }
    lots.push({
      lot: plan.lot,
      slug: plan.slug,
      images,
      unmatchedImages: plan.unmatchedImages,
      productsWithoutImage: plan.productsWithoutImage,
    });
  }

  const manifest: Manifest = { version: MANIFEST_VERSION, lots };
  await writeFile(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}
