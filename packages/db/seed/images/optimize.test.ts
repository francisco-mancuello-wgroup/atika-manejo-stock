import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { optimizeImage } from "./optimize";
import { solidPng } from "./test-helpers";

describe("optimizeImage", () => {
  it("converts to WebP and limits the long side to 1600px", async () => {
    const out = await optimizeImage(await solidPng(2400, 1200, "#336699"));
    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe("webp");
    expect([meta.width, meta.height]).toEqual([1600, 800]);
    expect([out.width, out.height]).toEqual([1600, 800]);
  });

  it("limits a tall image by its height", async () => {
    const out = await optimizeImage(await solidPng(1000, 2000, "#336699"));
    expect([out.width, out.height]).toEqual([800, 1600]);
  });

  it("never upscales", async () => {
    const out = await optimizeImage(await solidPng(120, 60, "#336699"));
    expect([out.width, out.height]).toEqual([120, 60]);
  });

  it("is deterministic", async () => {
    const source = await solidPng(300, 200, "#336699");
    const [a, b] = await Promise.all([optimizeImage(source), optimizeImage(source)]);
    expect(a.data.equals(b.data)).toBe(true);
  });
});
