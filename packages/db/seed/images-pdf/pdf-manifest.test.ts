import { describe, expect, it } from "vitest";
import { parsePdfManifest } from "./pdf-manifest";

const image = {
  productIndex: 0,
  code: null,
  name: "COSTA COCO",
  file: "casa-icona/costa-coco.webp",
  position: 0,
  page: 3,
  caption: "Costa Coco",
  rule: "exact",
  recreated: false,
  sourceFormat: "jpg",
  width: 1,
  height: 1,
  bytes: 1,
  sourceBytes: 1,
};

const lot = (over: object = {}) => ({
  lot: "Casa Icona",
  slug: "casa-icona",
  pdf: "atika.pdf",
  images: [image],
  unmatchedImages: [
    { page: 1, caption: null, reason: "no-caption", file: "sin-asignar/atika/p01-sin-texto.webp" },
  ],
  captionsWithoutImage: [],
  productsWithoutImage: [{ productIndex: 1, name: "NINA" }],
  stats: { imagesFound: 2, logosSkipped: 1, matched: 1, unmatched: 1 },
  ...over,
});

describe("parsePdfManifest", () => {
  it("accepts a well-formed manifest", () => {
    const manifest = parsePdfManifest({ version: 1, lots: [lot()] });
    expect(manifest.lots[0]?.images[0]?.rule).toBe("exact");
  });

  it("keeps the saved file of an unassigned photo", () => {
    const manifest = parsePdfManifest({ version: 1, lots: [lot()] });
    expect(manifest.lots[0]?.unmatchedImages[0]?.file).toBe("sin-asignar/atika/p01-sin-texto.webp");
  });

  it("rejects wrong versions, unsafe files and unknown rules", () => {
    expect(() => parsePdfManifest({ version: 2, lots: [] })).toThrow(/version/);
    expect(() =>
      parsePdfManifest({ version: 1, lots: [lot({ images: [{ ...image, file: "../x.webp" }] })] }),
    ).toThrow(/unsafe/);
    expect(() =>
      parsePdfManifest({ version: 1, lots: [lot({ images: [{ ...image, rule: "guess" }] })] }),
    ).toThrow(/rule/);
    const unmatched = (file: unknown) =>
      lot({ unmatchedImages: [{ page: 1, caption: null, reason: "no-caption", file }] });
    expect(() => parsePdfManifest({ version: 1, lots: [unmatched("atika/x.webp")] })).toThrow(
      /unsafe/,
    );
    expect(() => parsePdfManifest({ version: 1, lots: [unmatched(undefined)] })).toThrow(/file/);
    expect(() => parsePdfManifest(null)).toThrow(/object/);
  });
});
