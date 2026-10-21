import { describe, expect, it } from "vitest";
import { parseManifest } from "./manifest";

const image = {
  productIndex: 0,
  code: null,
  name: "Top",
  file: "atika/top.webp",
  position: 0,
  sourceRow: 3,
  sourceFormat: "png",
  width: 10,
  height: 20,
  bytes: 100,
  sourceBytes: 500,
};
const valid = {
  version: 1,
  lots: [
    { lot: "Átika", slug: "atika", images: [image], unmatchedImages: [], productsWithoutImage: [] },
  ],
};

describe("parseManifest", () => {
  it("accepts a well-formed manifest", () => {
    expect(parseManifest(valid)).toEqual(valid);
  });

  it("rejects another version", () => {
    expect(() => parseManifest({ ...valid, version: 2 })).toThrow(/version/i);
  });

  it("rejects files that could escape the media folder", () => {
    const bad = {
      ...valid,
      lots: [{ ...valid.lots[0], images: [{ ...image, file: "../x.webp" }] }],
    };
    expect(() => parseManifest(bad)).toThrow(/file/i);
  });

  it("rejects malformed entries", () => {
    expect(() => parseManifest({ version: 1, lots: [{ lot: "x" }] })).toThrow();
    expect(() => parseManifest(null)).toThrow();
  });
});
