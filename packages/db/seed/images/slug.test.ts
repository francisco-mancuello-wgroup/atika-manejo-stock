import { describe, expect, it } from "vitest";
import { assignFileNames, slugify } from "./slug";

describe("slugify", () => {
  it("drops accents, case and punctuation", () => {
    expect(slugify("Átika")).toBe("atika");
    expect(slugify("Zunilda Gutierrez")).toBe("zunilda-gutierrez");
    expect(slugify("  VESTIDO  Cala/ Roja!! ")).toBe("vestido-cala-roja");
  });

  it("falls back to a neutral stem when nothing is left", () => {
    expect(slugify("???")).toBe("producto");
  });

  it("keeps slugs short", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(60);
  });
});

describe("assignFileNames", () => {
  it("names files <lot>/<code-name>.webp", () => {
    expect(
      assignFileNames("milonga", [{ code: "MG-01", name: "Vestido Lila", images: 1 }]),
    ).toEqual([["milonga/mg-01-vestido-lila.webp"]]);
  });

  it("uses the name alone when there is no code", () => {
    expect(
      assignFileNames("casa-icona", [{ code: null, name: "COSTA SOLEIL", images: 1 }]),
    ).toEqual([["casa-icona/costa-soleil.webp"]]);
  });

  it("suffixes -2, -3 for several images of one product or colliding products", () => {
    expect(
      assignFileNames("atika", [
        { code: null, name: "Top", images: 2 },
        { code: null, name: "Top", images: 1 },
        { code: null, name: "Falda", images: 0 },
      ]),
    ).toEqual([["atika/top.webp", "atika/top-2.webp"], ["atika/top-3.webp"], []]);
  });
});
