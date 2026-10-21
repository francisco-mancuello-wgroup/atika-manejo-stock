import { describe, expect, it } from "vitest";
import { matchImages, type SheetImage } from "./match";

const image = (row: number, imageId = row, col = 1): SheetImage => ({
  row,
  col,
  imageId,
  extension: "png",
  buffer: Buffer.from([imageId]),
});

describe("matchImages", () => {
  const products = [{ sourceRows: [3, 4] }, { sourceRows: [5] }, { sourceRows: [6] }];

  it("maps an image to the product that owns its anchor row", () => {
    const result = matchImages(products, [image(4), image(5)]);
    expect(result.matches.map((m) => [m.productIndex, m.image.row])).toEqual([
      [0, 4],
      [1, 5],
    ]);
  });

  it("reports products without an image", () => {
    expect(matchImages(products, [image(3)]).withoutImage).toEqual([1, 2]);
  });

  it("reports images on header, blank or non-product rows instead of guessing", () => {
    const result = matchImages(products, [image(1), image(2), image(7), image(5)]);
    expect(result.unmatched.map((i) => i.row)).toEqual([1, 2, 7]);
    expect(result.matches).toHaveLength(1);
  });

  it("keeps several images of one product in row order", () => {
    const result = matchImages(products, [image(4, 9), image(3, 8)]);
    expect(result.matches.map((m) => [m.productIndex, m.image.imageId])).toEqual([
      [0, 8],
      [0, 9],
    ]);
  });

  it("drops a repeated drawing of the same media on the same product", () => {
    const result = matchImages(products, [image(5, 7), image(5, 7)]);
    expect(result.matches).toHaveLength(1);
  });
});
