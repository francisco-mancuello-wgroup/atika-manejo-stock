export const MANIFEST_VERSION = 1;

export interface ManifestImage {
  /** Position of the product in the lot, as the seed creates them. */
  productIndex: number;
  code: string | null;
  /** Name the seed gives the product; checked at seed time so a stale export is caught. */
  name: string;
  /** Path under the media folder, `<lot-slug>/<file>.webp`. */
  file: string;
  /** 0 is the cover. */
  position: number;
  sourceRow: number;
  sourceFormat: string;
  width: number;
  height: number;
  bytes: number;
  sourceBytes: number;
}

export interface ManifestLot {
  lot: string;
  slug: string;
  images: ManifestImage[];
  unmatchedImages: { row: number; col: number }[];
  productsWithoutImage: { productIndex: number; name: string }[];
}

export interface Manifest {
  version: typeof MANIFEST_VERSION;
  lots: ManifestLot[];
}

type Raw = Record<string, unknown>;

function record(value: unknown, what: string): Raw {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid manifest: ${what} must be an object`);
  }
  return value as Raw;
}

function list(value: unknown, what: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Invalid manifest: ${what} must be a list`);
  return value;
}

function str(raw: Raw, key: string): string {
  const value = raw[key];
  if (typeof value !== "string") throw new Error(`Invalid manifest: ${key} must be a string`);
  return value;
}

function int(raw: Raw, key: string): number {
  const value = raw[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid manifest: ${key} must be a non-negative integer`);
  }
  return value;
}

const SAFE_FILE = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*\.webp$/;

function parseImage(value: unknown): ManifestImage {
  const raw = record(value, "image");
  const file = str(raw, "file");
  if (!SAFE_FILE.test(file)) throw new Error(`Invalid manifest: unsafe file "${file}"`);
  const code = raw.code;
  if (code !== null && typeof code !== "string") {
    throw new Error("Invalid manifest: code must be a string or null");
  }
  return {
    productIndex: int(raw, "productIndex"),
    code,
    name: str(raw, "name"),
    file,
    position: int(raw, "position"),
    sourceRow: int(raw, "sourceRow"),
    sourceFormat: str(raw, "sourceFormat"),
    width: int(raw, "width"),
    height: int(raw, "height"),
    bytes: int(raw, "bytes"),
    sourceBytes: int(raw, "sourceBytes"),
  };
}

/** Validates untrusted JSON read from disk; throws a descriptive error otherwise. */
export function parseManifest(json: unknown): Manifest {
  const raw = record(json, "root");
  if (raw.version !== MANIFEST_VERSION) {
    throw new Error(`Invalid manifest: unsupported version ${String(raw.version)}`);
  }
  const lots = list(raw.lots, "lots").map((value): ManifestLot => {
    const lot = record(value, "lot");
    return {
      lot: str(lot, "lot"),
      slug: str(lot, "slug"),
      images: list(lot.images, "images").map(parseImage),
      unmatchedImages: list(lot.unmatchedImages, "unmatchedImages").map((entry) => {
        const item = record(entry, "unmatched image");
        return { row: int(item, "row"), col: int(item, "col") };
      }),
      productsWithoutImage: list(lot.productsWithoutImage, "productsWithoutImage").map((entry) => {
        const item = record(entry, "product without image");
        return { productIndex: int(item, "productIndex"), name: str(item, "name") };
      }),
    };
  });
  return { version: MANIFEST_VERSION, lots };
}
