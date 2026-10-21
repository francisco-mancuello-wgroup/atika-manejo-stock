import sharp from "sharp";

export const MAX_SIDE = 1600;
export const WEBP_QUALITY = 82;

export interface OptimizedImage {
  data: Buffer;
  width: number;
  height: number;
}

/** WebP, long side at most 1600px, never upscaled, metadata stripped. */
export async function optimizeImage(source: Buffer): Promise<OptimizedImage> {
  const { data, info } = await sharp(source)
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}
