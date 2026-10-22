import sharp from "sharp";

export const LOGO_MAX_SIDE = 400;
export const LOGO_WEBP_QUALITY = 90;
/** SVGs are rasterized at a high density first so the downscale stays sharp. */
const SVG_DENSITY = 300;

/** WebP with transparency kept: margins trimmed, fitted inside 400x400, never upscaled. */
export async function normalizeLogo(source: Buffer): Promise<Buffer> {
  return sharp(source, { density: SVG_DENSITY })
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 })
    .resize({
      width: LOGO_MAX_SIDE,
      height: LOGO_MAX_SIDE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: LOGO_WEBP_QUALITY })
    .toBuffer();
}
