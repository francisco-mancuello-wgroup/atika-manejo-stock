// @vitest-environment node
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { arrangePhotos, detectImageType, MAX_PHOTO_BYTES, prepareUpload } from "./photos";

async function image(format: "png" | "jpeg" | "webp", width = 50, height = 30) {
  const raw = sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 100, b: 50 } },
  });
  return new Uint8Array(await raw[format]().toBuffer());
}

describe("detectImageType", () => {
  it("recognizes jpeg, png and webp by magic bytes", async () => {
    expect(detectImageType(await image("jpeg"))).toBe("image/jpeg");
    expect(detectImageType(await image("png"))).toBe("image/png");
    expect(detectImageType(await image("webp"))).toBe("image/webp");
  });

  it("rejects anything else", () => {
    expect(detectImageType(new TextEncoder().encode("<svg></svg>"))).toBeNull();
    expect(detectImageType(new Uint8Array([]))).toBeNull();
  });
});

describe("prepareUpload", () => {
  it("converts to webp and fits within 1600px without enlarging", async () => {
    const big = await prepareUpload({ type: "image/png", bytes: await image("png", 3200, 1600) });
    expect(big.ok).toBe(true);
    if (big.ok) {
      const meta = await sharp(big.bytes).metadata();
      expect(meta).toMatchObject({ format: "webp", width: 1600, height: 800 });
    }
    const small = await prepareUpload({ type: "image/jpeg", bytes: await image("jpeg", 40, 20) });
    if (small.ok) expect(await sharp(small.bytes).metadata()).toMatchObject({ width: 40 });
    expect(small.ok).toBe(true);
  });

  it("rejects a file whose declared type is not allowed", async () => {
    const result = await prepareUpload({ type: "image/gif", bytes: await image("png") });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("JPG, PNG o WebP") });
  });

  it("rejects content that is not an image even if the declared type is", async () => {
    const result = await prepareUpload({
      type: "image/png",
      bytes: new TextEncoder().encode("not an image at all"),
    });
    expect(result).toMatchObject({ ok: false });
  });

  it("rejects files above 10 MB", async () => {
    const bytes = new Uint8Array(MAX_PHOTO_BYTES + 1);
    bytes.set(await image("png"));
    expect(await prepareUpload({ type: "image/png", bytes })).toMatchObject({
      ok: false,
      error: expect.stringContaining("10 MB"),
    });
  });
});

describe("arrangePhotos", () => {
  it("keeps the order of kept photos, appends new ones and drops removed ones", () => {
    expect(
      arrangePhotos({ existing: ["a", "b", "c"], remove: ["b"], uploads: 2, cover: null }),
    ).toEqual(["a", "c", "new:0", "new:1"]);
  });

  it("moves the chosen cover to the front", () => {
    expect(arrangePhotos({ existing: ["a", "b"], remove: [], uploads: 1, cover: "b" })).toEqual([
      "b",
      "a",
      "new:0",
    ]);
    expect(arrangePhotos({ existing: ["a", "b"], remove: [], uploads: 2, cover: "new:1" })).toEqual(
      ["new:1", "a", "b", "new:0"],
    );
  });

  it("ignores a cover that was removed or does not exist", () => {
    expect(arrangePhotos({ existing: ["a", "b"], remove: ["b"], uploads: 0, cover: "b" })).toEqual([
      "a",
    ]);
    expect(arrangePhotos({ existing: ["a"], remove: [], uploads: 0, cover: "zzz" })).toEqual(["a"]);
  });
});
