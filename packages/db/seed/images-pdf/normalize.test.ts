import { describe, expect, it } from "vitest";
import { aliasName, normalizeName } from "./normalize";

describe("normalizeName", () => {
  it("ignores case, accents, punctuation and the middle dot", () => {
    expect(normalizeName("Cora · Lima")).toBe("cora lima");
    expect(normalizeName("COSTA  COCO")).toBe("costa coco");
    expect(normalizeName("Bañado en Oro 24KT")).toBe("banado en oro 24kt");
    expect(normalizeName("Vitta White Cut-Out")).toBe("vitta white cut out");
  });

  it("drops a trailing single letter (Milonga's ' A') but never reduces a name to nothing", () => {
    expect(normalizeName("Cardigan A")).toBe("cardigan");
    expect(normalizeName("A")).toBe("a");
  });

  it("drops the ignored brand tokens", () => {
    expect(normalizeName("Aros Sordo Puerto Asymmetric", ["sordo"])).toBe("aros puerto asymmetric");
  });
});

describe("aliasName", () => {
  it("translates colours and drops generic garment words", () => {
    expect(aliasName("Vitta Mini Dress Black")).toBe("vitta negro");
    expect(aliasName("Vitta White Cut-Out")).toBe("vitta blanco cut out");
    expect(aliasName("Goza Dress Rio")).toBe("goza rio");
    expect(aliasName("Earcuff Cubagua Bañado en Oro Tamaño Small", ["sordo"])).toBe(
      "earcuff cubagua banado en oro small",
    );
  });
});
