import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ParsedLot } from "../excel/parse";
import { type Manifest, parseManifest } from "./manifest";
import { MEDIA_URL_PREFIX } from "./paths";

export interface ProductImageInput {
  url: string;
  alt: string;
  /** 0 is the cover. */
  position: number;
}

export interface ImagePlan {
  get(lotName: string, productIndex: number): ProductImageInput[];
}

export const EMPTY_IMAGE_PLAN: ImagePlan = { get: () => [] };

/** The manifest, or null when no export has been made (the seed then runs without images). */
export async function readManifest(dir: string): Promise<Manifest | null> {
  let text: string;
  try {
    text = await readFile(join(dir, "manifest.json"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  return parseManifest(JSON.parse(text));
}

const stale = (detail: string) =>
  new Error(
    `Product image manifest does not match the workbooks (${detail}); run pnpm db:export-images`,
  );

/**
 * Resolves which images each parsed product receives. Products are matched by lot name and
 * position, and the manifest's name and code must agree, so an export made from different
 * workbooks fails loudly instead of attaching a photo to the wrong product.
 */
export function planProductImages(manifest: Manifest, lots: readonly ParsedLot[]): ImagePlan {
  const plan = new Map<string, ProductImageInput[]>();
  const key = (lotName: string, productIndex: number) => `${lotName}\u0000${productIndex}`;

  for (const entry of manifest.lots) {
    const parsed = lots.find((l) => l.lotName === entry.lot);
    if (!parsed) throw stale(`lot "${entry.lot}" is not in the workbooks`);
    for (const image of entry.images) {
      const target = parsed.products[image.productIndex];
      if (!target) throw stale(`${entry.lot} has no product ${image.productIndex}`);
      if (target.name !== image.name || target.code !== image.code) {
        throw stale(`${entry.lot} product ${image.productIndex} is not "${image.name}"`);
      }
      const k = key(entry.lot, image.productIndex);
      plan.set(k, [
        ...(plan.get(k) ?? []),
        { url: `${MEDIA_URL_PREFIX}/${image.file}`, alt: target.name, position: image.position },
      ]);
    }
  }
  for (const images of plan.values()) images.sort((a, b) => a.position - b.position);

  return { get: (lotName, productIndex) => plan.get(key(lotName, productIndex)) ?? [] };
}

/** Replaces each target folder with the listed files copied from `sourceDir`. */
export async function copyProductImages(
  sourceDir: string,
  targetDirs: readonly string[],
  files: readonly string[],
): Promise<void> {
  for (const target of targetDirs) {
    await rm(target, { recursive: true, force: true });
    await mkdir(target, { recursive: true });
    for (const file of files) {
      const destination = join(target, file);
      await mkdir(dirname(destination), { recursive: true });
      await cp(join(sourceDir, file), destination);
    }
  }
}
