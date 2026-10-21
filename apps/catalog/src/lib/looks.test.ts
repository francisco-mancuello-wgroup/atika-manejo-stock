import { describe, expect, it } from "vitest";
import { findLookDescription, LOOKS, type Look } from "./looks";

const looks: Look[] = [
  { number: 1, name: "Costa Coco", description: "Blusa clara y short en tono cacao" },
  { number: 4, name: "Vitta Mini Dress Black", description: "Vestido corto negro" },
  { number: 9, name: "Goza Dress Rio", description: "Vestido largo en degradé" },
  { number: 14, name: "Cora · Lima", description: "Vestido corto en tono lima" },
  { number: 20, name: "Cora · Black", description: "Sin producto" },
  { number: 21, name: "Sin descripción", description: null },
];

describe("findLookDescription", () => {
  it("matches an exact normalized name (case, accents and punctuation do not matter)", () => {
    expect(findLookDescription(looks, "COSTA COCO")).toBe("Blusa clara y short en tono cacao");
    expect(findLookDescription(looks, "costa  coco")).toBe("Blusa clara y short en tono cacao");
  });

  it("translates colors and ignores generic words (Vitta Mini Dress Black = VITTA NEGRO)", () => {
    expect(findLookDescription(looks, "VITTA NEGRO")).toBe("Vestido corto negro");
    expect(findLookDescription(looks, "GOZA RIO")).toBe("Vestido largo en degradé");
  });

  it("matches when every look word is in the product name (CORA VERDE LIMA)", () => {
    expect(findLookDescription(looks, "CORA VERDE LIMA")).toBe("Vestido corto en tono lima");
  });

  it("returns null when nothing or a look without description matches", () => {
    expect(findLookDescription(looks, "ISSA NEGRO")).toBeNull();
    expect(findLookDescription(looks, "Sin descripción")).toBeNull();
    expect(findLookDescription([], "COSTA COCO")).toBeNull();
  });

  it("does not guess when several looks could match", () => {
    const twins: Look[] = [
      { number: 1, name: "Cora Lima", description: "a" },
      { number: 2, name: "Cora · Lima", description: "b" },
    ];
    expect(findLookDescription(twins, "CORA LIMA")).toBeNull();
  });
});

describe("committed look index", () => {
  it("has the eighteen looks of the Casa Icona catalog", () => {
    expect(LOOKS).toHaveLength(18);
    expect(findLookDescription(LOOKS, "COSTA VINO")).toBe("Prenda corta en tono vino");
  });
});
