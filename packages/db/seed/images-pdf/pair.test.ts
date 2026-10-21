import { describe, expect, it } from "vitest";
import { isPhoto, pairByOrder } from "./pair";

describe("isPhoto", () => {
  it("accepts product-sized portrait and landscape photos", () => {
    expect(isPhoto({ width: 1075, height: 1444 })).toBe(true);
    expect(isPhoto({ width: 322, height: 688 })).toBe(true);
    expect(isPhoto({ width: 1175, height: 1444 })).toBe(true);
  });

  it("rejects logos and banners by size or aspect", () => {
    expect(isPhoto({ width: 280, height: 78 })).toBe(false);
    expect(isPhoto({ width: 1246, height: 273 })).toBe(false);
    expect(isPhoto({ width: 200, height: 200 })).toBe(false);
  });
});

describe("pairByOrder", () => {
  const img = (top: number, left = 0) => ({ top, left, id: `i${top}` });

  it("pairs images and captions top to bottom", () => {
    const result = pairByOrder([img(700, 490), img(160, 54)], ["first", "second"]);
    expect(result.pairs.map((p) => [p.image.id, p.caption])).toEqual([
      ["i160", "first"],
      ["i700", "second"],
    ]);
    expect(result.unpairedImages).toEqual([]);
    expect(result.unpairedCaptions).toEqual([]);
  });

  it("pairs nothing when the counts differ", () => {
    const result = pairByOrder([img(1), img(2)], ["only"]);
    expect(result.pairs).toEqual([]);
    expect(result.unpairedImages).toHaveLength(2);
    expect(result.unpairedCaptions).toEqual(["only"]);
  });

  it("leaves a page without captions entirely unpaired", () => {
    const result = pairByOrder([img(1)], []);
    expect(result.pairs).toEqual([]);
    expect(result.unpairedImages).toHaveLength(1);
  });
});
