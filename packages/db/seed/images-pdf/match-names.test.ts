import { describe, expect, it } from "vitest";
import { matchNames } from "./match-names";

const products = (names: string[]) => names.map((name, productIndex) => ({ productIndex, name }));

describe("matchNames", () => {
  const casaIcona = products([
    "COSTA COCO",
    "COSTA BLACK",
    "VITTA NEGRO",
    "GOZA RIO",
    "CORA VERDE LIMA",
    "CORA BLANCO",
    "NINA",
  ]);

  it("matches exact normalized names", () => {
    expect(matchNames(["Costa Coco", "Cora · Blanco"], casaIcona)).toEqual([
      { status: "matched", productIndex: 0, rule: "exact" },
      { status: "matched", productIndex: 5, rule: "exact" },
    ]);
  });

  it("matches after colour translation and generic-word removal", () => {
    expect(matchNames(["Vitta Mini Dress Black", "Goza Dress Rio"], casaIcona)).toEqual([
      { status: "matched", productIndex: 2, rule: "alias" },
      { status: "matched", productIndex: 3, rule: "alias" },
    ]);
  });

  it("matches a caption whose words all appear in exactly one product name", () => {
    expect(matchNames(["Cora · Lima"], casaIcona)).toEqual([
      { status: "matched", productIndex: 4, rule: "token-subset" },
    ]);
  });

  it("never matches a lone word by containment", () => {
    expect(matchNames(["Cora"], casaIcona)).toEqual([{ status: "none" }]);
  });

  it("reports captions without a product", () => {
    expect(matchNames(["Cora · Black", "Vestido largo bicolor"], casaIcona)).toEqual([
      { status: "none" },
      { status: "none" },
    ]);
  });

  it("reports an ambiguous caption instead of choosing", () => {
    const twins = products(["COSTA BLACK", "COSTA NEGRO", "COSTA COCO"]);
    expect(matchNames(["Costa Black"], twins)).toEqual([
      { status: "matched", productIndex: 0, rule: "exact" },
    ]);
    expect(matchNames(["Costa Negro Mini"], twins)).toEqual([
      { status: "ambiguous", candidates: [0, 1] },
    ]);
    const dupes = products(["COSTA COCO", "COSTA COCO"]);
    expect(matchNames(["Costa Coco"], dupes)).toEqual([
      { status: "ambiguous", candidates: [0, 1] },
    ]);
  });

  it("does not let two captions claim the same product", () => {
    expect(matchNames(["Vitta Mini Dress Black", "Vitta Negro"], casaIcona)).toEqual([
      { status: "ambiguous", candidates: [2] },
      { status: "ambiguous", candidates: [2] },
    ]);
  });

  it("ignores the brand tokens in product names", () => {
    const sordo = products(["Aros Sordo Puerto Asymmetric Bañado en Oro 24KT"]);
    expect(matchNames(["Aros Puerto Asymmetric Bañado en Oro 24KT"], sordo, ["sordo"])).toEqual([
      { status: "matched", productIndex: 0, rule: "exact" },
    ]);
  });
});
