import { describe, expect, it } from "vitest";
import { colorFromName, colorFromText, resolveColor } from "./colors";

describe("colorFromText", () => {
  it("maps a Spanish color word to a label and swatch, ignoring case and accents", () => {
    expect(colorFromText("NEGRO")).toEqual({ label: "Negro", hex: "#1c1c1c" });
    expect(colorFromText("Celeste")?.label).toBe("Celeste");
    expect(colorFromText("ámbar")).toBeNull();
  });

  it("translates English words used by the supplier", () => {
    expect(colorFromText("black")).toEqual(colorFromText("negro"));
    expect(colorFromText("white")).toEqual(colorFromText("blanco"));
  });

  it("finds the first known word of a compound color and prefers two-word colors", () => {
    expect(colorFromText("BLANCO CON COSTURAS TOSTADAS")?.label).toBe("Blanco");
    expect(colorFromText("SÍMIL DENIM AZUL")?.label).toBe("Azul");
    expect(colorFromText("verde lima")).toEqual(colorFromText("lima"));
  });

  it("knows no swatch for prints and fantasy names", () => {
    for (const word of ["ESTAMPADO", "RIO", "SOLEIL", "RAMBUTAN", "PITAYA"]) {
      expect(colorFromText(word)).toBeNull();
    }
  });
});

describe("colorFromName", () => {
  it("reads the trailing color word of the product name", () => {
    expect(colorFromName("COSTA VINO")?.label).toBe("Vino");
    expect(colorFromName("Vitta Perla")?.label).toBe("Perla");
    expect(colorFromName("COSTA BLACK")?.label).toBe("Negro");
    expect(colorFromName("CORA VERDE LIMA")?.label).toBe("Verde lima");
    expect(colorFromName("ZAMBA AZUL")?.label).toBe("Azul");
    expect(colorFromName("CORA FUCSIA")?.label).toBe("Fucsia");
    expect(colorFromName("COSTA COCO")?.label).toBe("Coco");
  });

  it("only looks at the end: a color in the middle or a non color ending gives nothing", () => {
    expect(colorFromName("NEGRO MIDI DRESS")).toBeNull();
    expect(colorFromName("GOZA RIO")).toBeNull();
    expect(colorFromName("COSTA SOLEIL")).toBeNull();
    expect(colorFromName("COSTA RAMBUTAN")).toBeNull();
    expect(colorFromName("NINA")).toBeNull();
    expect(colorFromName("")).toBeNull();
  });
});

describe("resolveColor", () => {
  it("shows the stored color text, with a swatch when it is a known color", () => {
    expect(resolveColor("Marfil", "Cardigan A")).toEqual({
      label: "Marfil",
      hex: expect.stringMatching(/^#/),
    });
    expect(resolveColor("BLANCO CON COSTURAS TOSTADAS", "x")).toEqual({
      label: "Blanco con costuras tostadas",
      hex: colorFromText("blanco")?.hex,
    });
  });

  it("keeps an unknown stored color as text only", () => {
    expect(resolveColor("ESTAMPADO", "Camisa A")).toEqual({ label: "Estampado", hex: null });
  });

  it("drops stored values that look like internal codes", () => {
    expect(resolveColor("NG U985001", "Cardigan A")).toBeNull();
  });

  it("falls back to the name when nothing is stored", () => {
    expect(resolveColor(null, "ISSA NEGRO")?.label).toBe("Negro");
    expect(resolveColor("  ", "ISSA NEGRO")?.label).toBe("Negro");
    expect(resolveColor(null, "NINA")).toBeNull();
  });
});
