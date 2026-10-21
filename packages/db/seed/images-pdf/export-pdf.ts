import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { type OptimizedImage, optimizeImage } from "../images/optimize";
import {
  PDF_MANIFEST_VERSION,
  type PdfManifest,
  type PdfManifestImage,
  type PdfManifestLot,
} from "./pdf-manifest";
import type { PdfLotPlan } from "./plan";

/**
 * Empties `outDir`, writes every optimized image and `manifest.json`, and returns the manifest.
 * The output depends only on the plans and the photo bytes, so a re-run yields the same bytes.
 * `readPhoto` receives a photo's `src` and returns its bytes.
 */
export async function writePdfExport(
  outDir: string,
  plans: readonly PdfLotPlan[],
  readPhoto: (src: string) => Promise<Buffer>,
  optimize: (source: Buffer) => Promise<OptimizedImage> = optimizeImage,
): Promise<PdfManifest> {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const lots: PdfManifestLot[] = [];
  for (const plan of plans) {
    const images: PdfManifestImage[] = [];
    for (const entry of plan.entries) {
      const source = await readPhoto(entry.photo.src);
      const optimized = await optimize(source);
      const target = join(outDir, entry.file);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, optimized.data);
      images.push({
        productIndex: entry.productIndex,
        code: entry.code,
        name: entry.name,
        file: entry.file,
        position: entry.position,
        page: entry.page,
        caption: entry.caption,
        rule: entry.rule,
        recreated: entry.recreated,
        sourceFormat: entry.photo.format,
        width: optimized.width,
        height: optimized.height,
        bytes: optimized.data.length,
        sourceBytes: source.length,
      });
    }
    lots.push({
      lot: plan.lot,
      slug: plan.slug,
      pdf: plan.pdf,
      images,
      unmatchedImages: plan.unmatchedImages.map(({ page, caption, reason }) => ({
        page,
        caption,
        reason,
      })),
      captionsWithoutImage: plan.captionsWithoutImage,
      productsWithoutImage: plan.productsWithoutImage,
      stats: plan.stats,
    });
  }

  const manifest: PdfManifest = { version: PDF_MANIFEST_VERSION, lots };
  await writeFile(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}
