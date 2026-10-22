import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { LOGO_MAX_SIDE, normalizeLogo } from "./normalize-logo";

const svg = (w: number, h: number, body: string) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);

describe("normalizeLogo", () => {
  it("rasterizes an SVG to webp, trims transparent margins and keeps transparency", async () => {
    const source = svg(1000, 1000, '<rect x="400" y="450" width="200" height="100" fill="#c00"/>');
    const out = await normalizeLogo(source);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.hasAlpha).toBe(true);
    // The 200x100 shape fills the frame once the margins are gone (aspect 2:1).
    expect(meta.width && meta.height && meta.width / meta.height).toBeCloseTo(2, 0);
  });

  it("fits inside the max side", async () => {
    const source = svg(3000, 1000, '<rect width="3000" height="1000" fill="#036"/>');
    const meta = await sharp(await normalizeLogo(source)).metadata();
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(LOGO_MAX_SIDE);
    expect(meta.width).toBe(LOGO_MAX_SIDE);
  });

  it("never upscales a small raster", async () => {
    const png = await sharp({
      create: { width: 40, height: 20, channels: 4, background: "#036" },
    })
      .png()
      .toBuffer();
    const meta = await sharp(await normalizeLogo(png)).metadata();
    expect([meta.width, meta.height]).toEqual([40, 20]);
  });

  it("rejects data that is not an image", async () => {
    await expect(normalizeLogo(Buffer.from("<html>not found</html>"))).rejects.toThrow();
  });
});
