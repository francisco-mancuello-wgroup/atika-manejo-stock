import sharp from "sharp";

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_SIDE = 1600;
const WEBP_QUALITY = 82;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"] as const;
type ImageType = (typeof ALLOWED)[number];

export interface PhotoUpload {
  /** MIME type declared by the browser. */
  type: string;
  bytes: Uint8Array;
}

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, i) => bytes[offset + i] === byte);

/** The real type from the file's magic bytes (never trust the extension or declared MIME). */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
    return "image/webp";
  return null;
}

export type PreparedPhoto = { ok: true; bytes: Uint8Array } | { ok: false; error: string };

/** Validates MIME + size + magic bytes, then optimizes to WebP (longest side `maxSide`, quality 82). */
export async function prepareUpload(
  upload: PhotoUpload,
  maxSide: number = MAX_SIDE,
): Promise<PreparedPhoto> {
  if (
    !(ALLOWED as readonly string[]).includes(upload.type) ||
    detectImageType(upload.bytes) === null
  ) {
    return { ok: false, error: "Subí fotos JPG, PNG o WebP." };
  }
  if (upload.bytes.byteLength > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Cada foto puede pesar hasta 10 MB." };
  }
  try {
    const out = await sharp(upload.bytes)
      .rotate()
      .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    return { ok: true, bytes: new Uint8Array(out) };
  } catch {
    return { ok: false, error: "No se pudo leer una de las fotos." };
  }
}

/**
 * Final photo order as keys: kept existing ids first (current order) then `new:<n>` for each
 * upload; the chosen cover moves to the front. A cover that is gone or unknown is ignored.
 */
export function arrangePhotos(input: {
  existing: readonly string[];
  remove: readonly string[];
  uploads: number;
  cover: string | null;
}): string[] {
  const removed = new Set(input.remove);
  const keys = [
    ...input.existing.filter((id) => !removed.has(id)),
    ...Array.from({ length: input.uploads }, (_, i) => `new:${i}`),
  ];
  if (input.cover && keys.includes(input.cover)) {
    return [input.cover, ...keys.filter((key) => key !== input.cover)];
  }
  return keys;
}
