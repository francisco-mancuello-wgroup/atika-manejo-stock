import { describe, expect, it } from "vitest";
import type { PageLayout } from "../images-pdf/layout";
import { type Look, matchLooks, parseLookIndex } from "./looks";

const text = (top: number, left: number, value: string) => ({ top, left, size: 12, text: value });

const indexPage: PageLayout = {
  page: 2,
  images: [],
  texts: [
    text(53, 168, "C A S A   I C O N A"),
    text(131, 69, "Índice"),
    text(288, 69, "01"),
    text(287, 114, "Costa Coco"),
    text(320, 114, "Blusa clara y short en tono cacao"),
    text(372, 69, "02"),
    text(371, 114, "Costa Vino"),
    text(404, 114, "Prenda corta en tono vino"),
    text(288, 464, "10"),
    text(287, 509, "Vestido corto negro"),
    text(320, 509, "Cuello alto y aberturas en la cintura"),
    text(1208, 781, "Í N D I C E"),
  ],
};
const otherPage: PageLayout = { page: 3, images: [], texts: [text(1052, 775, "01")] };

describe("parseLookIndex", () => {
  it("reads number, name and description from both columns, ordered by number", () => {
    expect(parseLookIndex([otherPage, indexPage])).toEqual([
      { number: 1, name: "Costa Coco", description: "Blusa clara y short en tono cacao" },
      { number: 2, name: "Costa Vino", description: "Prenda corta en tono vino" },
      {
        number: 10,
        name: "Vestido corto negro",
        description: "Cuello alto y aberturas en la cintura",
      },
    ]);
  });

  it("fails when the PDF has no index page", () => {
    expect(() => parseLookIndex([otherPage])).toThrow(/index/i);
  });
});

describe("matchLooks", () => {
  const looks: Look[] = [
    { number: 4, name: "Vitta Mini Dress Black", description: "Vestido corto negro con aberturas" },
    { number: 14, name: "Cora · Lima", description: "Vestido corto en tono lima" },
    { number: 8, name: "Vestido largo bicolor", description: "Rosa claro y rojo" },
  ];

  it("matches products to looks with the PDF name rules and leaves the rest unmatched", () => {
    const products = ["VITTA NEGRO", "CORA VERDE LIMA", "NINA"].map((name) => ({ name }));
    expect(matchLooks(looks, products).map((l) => l?.number ?? null)).toEqual([4, 14, null]);
  });
});
