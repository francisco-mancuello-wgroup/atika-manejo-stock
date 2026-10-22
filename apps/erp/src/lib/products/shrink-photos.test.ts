import { describe, expect, it } from "vitest";
import { fitWithin, MAX_UPLOAD_BYTES, shrunkType, tooBigToUpload } from "./shrink-photos";

describe("fitWithin", () => {
  it("scales the longest side down to the limit, keeping the proportions", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 6000, 1600)).toEqual({ width: 800, height: 1600 });
  });

  it("never enlarges a small photo", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});

describe("tooBigToUpload", () => {
  it("flags a batch over what one request can carry on Vercel", () => {
    expect(tooBigToUpload([MAX_UPLOAD_BYTES])).toBe(false);
    expect(tooBigToUpload([MAX_UPLOAD_BYTES / 2, MAX_UPLOAD_BYTES / 2 + 1])).toBe(true);
  });
});

describe("shrunkType", () => {
  it("keeps JPEGs as JPEG and turns PNG and WebP into WebP so transparency survives", () => {
    expect(shrunkType("image/jpeg")).toBe("image/jpeg");
    expect(shrunkType("image/png")).toBe("image/webp");
    expect(shrunkType("image/webp")).toBe("image/webp");
  });
});
