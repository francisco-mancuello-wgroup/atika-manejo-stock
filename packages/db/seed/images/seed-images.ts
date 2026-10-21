import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ParsedLot } from "../excel/parse";
import { type PdfManifest, parsePdfManifest } from "../images-pdf/pdf-manifest";
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

/** What the seed needs from any image manifest: where each file belongs. */
export interface ImageManifest {
  lots: readonly {
    lot: string;
    images: readonly {
      productIndex: number;
      code: string | null;
      name: string;
      file: string;
      position: number;
    }[];
  }[];
}

async function readManifestJson(dir: string): Promise<unknown | null> {
  let text: string;
  try {
    text = await readFile(join(dir, "manifest.json"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  return JSON.parse(text);
}

/** The manifest, or null when no export has been made (the seed then runs without images). */
export async function readManifest(dir: string): Promise<Manifest | null> {
  const json = await readManifestJson(dir);
  return json === null ? null : parseManifest(json);
}

/** The brand PDF manifest, or null when `pnpm db:export-images-pdf` has not been run. */
export async function readPdfManifest(dir: string): Promise<PdfManifest | null> {
  const json = await readManifestJson(dir);
  return json === null ? null : parsePdfManifest(json);
}

const stale = (detail: string) =>
  new Error(
    `Product image manifest does not match the workbooks (${detail}); re-run the image export (pnpm db:export-images or pnpm db:export-images-pdf)`,
  );

/**
 * Resolves which images each parsed product receives. Products are matched by lot name and
 * position, and the manifest's name and code must agree, so an export made from different
 * workbooks fails loudly instead of attaching a photo to the wrong product. `mediaSubdir` is the
 * folder under the media root that serves this manifest's files ("" for the workbook photos).
 */
export function planProductImages(
  manifest: ImageManifest,
  lots: readonly ParsedLot[],
  mediaSubdir = "",
): ImagePlan {
  const plan = new Map<string, ProductImageInput[]>();
  const key = (lotName: string, productIndex: number) => `${lotName}\u0000${productIndex}`;
  const prefix = mediaSubdir ? `${MEDIA_URL_PREFIX}/${mediaSubdir}` : MEDIA_URL_PREFIX;

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
        { url: `${prefix}/${image.file}`, alt: target.name, position: image.position },
      ]);
    }
  }
  for (const images of plan.values()) images.sort((a, b) => a.position - b.position);

  return { get: (lotName, productIndex) => plan.get(key(lotName, productIndex)) ?? [] };
}

/**
 * A product takes the primary plan's photos when it has any, otherwise the fallback's. The two are
 * never mixed: the fallback (workbook thumbnails) is much smaller than the primary photos (brand
 * PDFs), and a gallery of both would show a blurry duplicate of the same look.
 */
export function mergeImagePlans(primary: ImagePlan, fallback: ImagePlan): ImagePlan {
  return {
    get: (lotName, productIndex) => {
      const preferred = primary.get(lotName, productIndex);
      return preferred.length > 0 ? preferred : fallback.get(lotName, productIndex);
    },
  };
}

export interface MediaSource {
  /** URL prefix this folder is served under, e.g. `/media/products/brand-pdf`. */
  urlPrefix: string;
  dir: string;
}

export interface MediaFile {
  /** Absolute source path. */
  from: string;
  /** Path under the apps' `public/media/products`. */
  to: string;
}

/**
 * The files a plan actually uses, each resolved to its source folder. The most specific URL prefix
 * wins, so `/media/products/brand-pdf/...` is never mistaken for a workbook photo.
 */
export function mediaFilesFor(
  plan: ImagePlan,
  lots: readonly ParsedLot[],
  sources: readonly MediaSource[],
): MediaFile[] {
  const ordered = [...sources].sort((a, b) => b.urlPrefix.length - a.urlPrefix.length);
  const files = new Map<string, MediaFile>();
  for (const lot of lots) {
    for (const index of lot.products.keys()) {
      for (const { url } of plan.get(lot.lotName, index)) {
        const source = ordered.find((s) => url.startsWith(`${s.urlPrefix}/`));
        if (!source) throw new Error(`No media folder serves ${url}`);
        files.set(url, {
          from: join(source.dir, url.slice(source.urlPrefix.length + 1)),
          to: url.slice(MEDIA_URL_PREFIX.length + 1),
        });
      }
    }
  }
  return [...files.values()];
}

/** Replaces each target folder with the listed files. */
export async function copyProductImages(
  targetDirs: readonly string[],
  files: readonly MediaFile[],
): Promise<void> {
  for (const target of targetDirs) {
    await rm(target, { recursive: true, force: true });
    await mkdir(target, { recursive: true });
    for (const file of files) {
      const destination = join(target, file.to);
      await mkdir(dirname(destination), { recursive: true });
      await cp(file.from, destination);
    }
  }
}
