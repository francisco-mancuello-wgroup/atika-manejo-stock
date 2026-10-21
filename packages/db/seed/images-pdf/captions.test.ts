import { describe, expect, it } from "vitest";
import { parseCaptions } from "./captions";
import type { PageLayout, PageText } from "./layout";

const text = (top: number, size: number, value: string, left = 69): PageText => ({
  top,
  left,
  size,
  text: value,
});

const page = (texts: PageText[]): PageLayout => ({ page: 3, texts, images: [] });

describe("parseCaptions numbered-looks (Casa Icona)", () => {
  const look = page([
    text(53, 10, "C A S A   I C O N A"),
    text(1052, 60, "01", 775),
    text(1073, 41, "Costa Coco"),
    text(1125, 13, "Blusa clara y short en tono cacao"),
    text(1208, 10, "0 1   /   1 8", 782),
  ]);

  it("reads the look name that follows the look number", () => {
    expect(parseCaptions(look, "numbered-looks")).toEqual({
      captions: [{ text: "Costa Coco", detail: "Blusa clara y short en tono cacao" }],
      recreated: false,
    });
  });

  it("finds nothing on pages whose number does not match the footer (cover, index)", () => {
    const index = page([
      text(100, 60, "01"),
      text(100, 40, "Costa Coco"),
      text(300, 60, "02"),
      text(300, 40, "Costa Vino"),
      text(1208, 10, "ÍNDICE", 782),
    ]);
    expect(parseCaptions(index, "numbered-looks").captions).toEqual([]);
  });
});

describe("parseCaptions sections (aros / earcuffs)", () => {
  const aros = page([
    text(100, 40, "Aros", 54),
    text(302, 41, "Puerto", 455),
    text(346, 41, "Asymmetric", 455),
    text(421, 16, "Bañado en Oro 24KT", 455),
    text(464, 29, "Gs. 1.207.680", 455),
    text(843, 41, "Oriente", 54),
    text(918, 16, "Bañado en Oro 24KT", 54),
    text(961, 29, "Gs. 1.562.880", 54),
    text(1202, 11, "Precios en guaraníes por artículo", 54),
    text(1220, 11, "Imágenes recreadas digitalmente.", 54),
  ]);

  it("builds one caption per price block, top to bottom, with the singular section first", () => {
    const result = parseCaptions(aros, "sections");
    expect(result.captions).toEqual([
      { text: "Aros Puerto Asymmetric Bañado en Oro 24KT", detail: null },
      { text: "Aros Oriente Bañado en Oro 24KT", detail: null },
    ]);
  });

  it("flags digitally recreated images", () => {
    expect(parseCaptions(aros, "sections").recreated).toBe(true);
  });

  it("singularizes Earcuffs and keeps size lines", () => {
    const earcuffs = page([
      text(100, 40, "Earcuffs", 54),
      text(300, 41, "Cubagua", 455),
      text(380, 16, "Bañado en Oro", 455),
      text(400, 16, "Tamaño Small", 455),
      text(464, 29, "Gs. 1.420.800", 455),
    ]);
    expect(parseCaptions(earcuffs, "sections").captions).toEqual([
      { text: "Earcuff Cubagua Bañado en Oro Tamaño Small", detail: null },
    ]);
  });

  it("has no captions on the cover page", () => {
    expect(parseCaptions(page([text(100, 40, "AROS Y EARCUFFS")]), "sections").captions).toEqual(
      [],
    );
  });
});

describe("parseCaptions none (Milonga editorial)", () => {
  it("never reads product names from section titles", () => {
    const result = parseCaptions(page([text(1020, 30, "Vestidos", 71)]), "none");
    expect(result.captions).toEqual([]);
  });
});
