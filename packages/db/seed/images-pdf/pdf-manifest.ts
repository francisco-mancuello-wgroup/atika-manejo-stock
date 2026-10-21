import { int, list, type Raw, record, str } from "../images/manifest";

export const PDF_MANIFEST_VERSION = 1;

export type PdfMatchRule = "exact" | "alias" | "token-subset";

export interface PdfManifestImage {
  /** Position of the product in the lot, as the seed creates them. */
  productIndex: number;
  code: string | null;
  /** Name the seed gives the product; checked at seed time so a stale export is caught. */
  name: string;
  /** Path under the export folder, `<lot-slug>/<file>.webp`. */
  file: string;
  /** 0 is the cover. */
  position: number;
  page: number;
  /** Caption text read from the PDF page. */
  caption: string;
  rule: PdfMatchRule;
  /** The PDF states the image was recreated digitally ("Imágenes recreadas digitalmente"). */
  recreated: boolean;
  sourceFormat: string;
  width: number;
  height: number;
  bytes: number;
  sourceBytes: number;
}

/** A photo that matched no product; saved under `sin-asignar/` and never linked by the seed. */
export interface PdfManifestUnmatched {
  page: number;
  caption: string | null;
  reason: string;
  /** Path under the export folder, `sin-asignar/<pdf-slug>/<file>.webp`. */
  file: string;
}

export interface PdfManifestLot {
  lot: string;
  slug: string;
  pdf: string;
  images: PdfManifestImage[];
  unmatchedImages: PdfManifestUnmatched[];
  captionsWithoutImage: { page: number; caption: string }[];
  productsWithoutImage: { productIndex: number; name: string }[];
  stats: { imagesFound: number; logosSkipped: number; matched: number; unmatched: number };
}

export interface PdfManifest {
  version: typeof PDF_MANIFEST_VERSION;
  lots: PdfManifestLot[];
}

const SAFE_FILE = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*\.webp$/;
const SAFE_UNASSIGNED_FILE = /^sin-asignar\/[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*\.webp$/;
const RULES: readonly string[] = ["exact", "alias", "token-subset"];

function bool(raw: Raw, key: string): boolean {
  const value = raw[key];
  if (typeof value !== "boolean") throw new Error(`Invalid manifest: ${key} must be a boolean`);
  return value;
}

function nullableStr(raw: Raw, key: string): string | null {
  const value = raw[key];
  if (value !== null && typeof value !== "string") {
    throw new Error(`Invalid manifest: ${key} must be a string or null`);
  }
  return value;
}

function parseImage(value: unknown): PdfManifestImage {
  const raw = record(value, "image");
  const file = str(raw, "file");
  if (!SAFE_FILE.test(file)) throw new Error(`Invalid manifest: unsafe file "${file}"`);
  const rule = str(raw, "rule");
  if (!RULES.includes(rule)) throw new Error(`Invalid manifest: unknown rule "${rule}"`);
  return {
    productIndex: int(raw, "productIndex"),
    code: nullableStr(raw, "code"),
    name: str(raw, "name"),
    file,
    position: int(raw, "position"),
    page: int(raw, "page"),
    caption: str(raw, "caption"),
    rule: rule as PdfMatchRule,
    recreated: bool(raw, "recreated"),
    sourceFormat: str(raw, "sourceFormat"),
    width: int(raw, "width"),
    height: int(raw, "height"),
    bytes: int(raw, "bytes"),
    sourceBytes: int(raw, "sourceBytes"),
  };
}

/** Validates untrusted JSON read from disk; throws a descriptive error otherwise. */
export function parsePdfManifest(json: unknown): PdfManifest {
  const raw = record(json, "root");
  if (raw.version !== PDF_MANIFEST_VERSION) {
    throw new Error(`Invalid manifest: unsupported version ${String(raw.version)}`);
  }
  const lots = list(raw.lots, "lots").map((value): PdfManifestLot => {
    const lot = record(value, "lot");
    const stats = record(lot.stats, "stats");
    return {
      lot: str(lot, "lot"),
      slug: str(lot, "slug"),
      pdf: str(lot, "pdf"),
      images: list(lot.images, "images").map(parseImage),
      unmatchedImages: list(lot.unmatchedImages, "unmatchedImages").map((entry) => {
        const item = record(entry, "unmatched image");
        const file = str(item, "file");
        if (!SAFE_UNASSIGNED_FILE.test(file)) {
          throw new Error(`Invalid manifest: unsafe file "${file}"`);
        }
        return {
          page: int(item, "page"),
          caption: nullableStr(item, "caption"),
          reason: str(item, "reason"),
          file,
        };
      }),
      captionsWithoutImage: list(lot.captionsWithoutImage, "captionsWithoutImage").map((entry) => {
        const item = record(entry, "caption without image");
        return { page: int(item, "page"), caption: str(item, "caption") };
      }),
      productsWithoutImage: list(lot.productsWithoutImage, "productsWithoutImage").map((entry) => {
        const item = record(entry, "product without image");
        return { productIndex: int(item, "productIndex"), name: str(item, "name") };
      }),
      stats: {
        imagesFound: int(stats, "imagesFound"),
        logosSkipped: int(stats, "logosSkipped"),
        matched: int(stats, "matched"),
        unmatched: int(stats, "unmatched"),
      },
    };
  });
  return { version: PDF_MANIFEST_VERSION, lots };
}
