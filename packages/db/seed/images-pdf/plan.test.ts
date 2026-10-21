import { describe, expect, it } from "vitest";
import type { PageText } from "./layout";
import { type PdfPageInput, type PhotoFile, planPdfLot } from "./plan";

const photo = (src: string, top = 100, left = 69): PhotoFile => ({
  src,
  top,
  left,
  width: 1000,
  height: 1400,
  format: "jpg",
});

const look = (page: number, number: string, name: string, src: string): PdfPageInput => {
  const texts: PageText[] = [
    { top: 1052, left: 775, size: 60, text: number },
    { top: 1073, left: 69, size: 41, text: name },
    { top: 1208, left: 782, size: 10, text: `${number} / 18` },
  ];
  return { layout: { page, texts, images: [] }, photos: [photo(src)], logosSkipped: 1 };
};

const source = {
  pdf: "atika.pdf",
  lotName: "Casa Icona",
  captions: "numbered-looks",
} as const;

const products = [
  { code: null, name: "COSTA COCO", brand: null },
  { code: null, name: "VITTA NEGRO", brand: null },
  { code: null, name: "NINA", brand: null },
];

describe("planPdfLot", () => {
  const cover: PdfPageInput = {
    layout: { page: 1, texts: [], images: [] },
    photos: [photo("cover.jpg")],
    logosSkipped: 0,
  };
  const pages = [
    cover,
    look(3, "01", "Costa Coco", "a.jpg"),
    look(4, "02", "Vitta Mini Dress Black", "b.jpg"),
    look(5, "03", "Vestido largo bicolor", "c.jpg"),
  ];

  it("assigns matched photos with the seed's product key and a deterministic file name", () => {
    const plan = planPdfLot(source, products, pages);
    expect(plan.slug).toBe("casa-icona");
    expect(plan.entries.map((e) => [e.productIndex, e.name, e.code, e.file, e.position])).toEqual([
      [0, "COSTA COCO", null, "casa-icona/costa-coco.webp", 0],
      [1, "VITTA NEGRO", null, "casa-icona/vitta-negro.webp", 0],
    ]);
    expect(plan.entries.map((e) => [e.page, e.caption, e.rule])).toEqual([
      [3, "Costa Coco", "exact"],
      [4, "Vitta Mini Dress Black", "alias"],
    ]);
  });

  it("reports photos without a product and products without a photo, never guessing", () => {
    const plan = planPdfLot(source, products, pages);
    expect(plan.unmatchedImages).toEqual([
      { page: 1, src: "cover.jpg", caption: null, reason: "no-caption" },
      { page: 5, src: "c.jpg", caption: "Vestido largo bicolor", reason: "no-product" },
    ]);
    expect(plan.productsWithoutImage).toEqual([{ productIndex: 2, name: "NINA" }]);
    expect(plan.stats).toEqual({ imagesFound: 4, logosSkipped: 3, matched: 2, unmatched: 2 });
  });

  it("uses the code in the file name when the product has one", () => {
    const plan = planPdfLot(
      source,
      [{ code: "ZG1", name: "COSTA COCO", brand: null }],
      [pages[1] as PdfPageInput],
    );
    expect(plan.entries[0]?.file).toBe("casa-icona/zg1-costa-coco.webp");
  });

  it("only considers products accepted by the source filter", () => {
    const sordo = {
      pdf: "aros.pdf",
      lotName: "Átika",
      captions: "none",
      includeProduct: (p: { brand: string | null }) => p.brand === "Sordo",
    } as const;
    const plan = planPdfLot(
      sordo,
      [
        { code: null, name: "Top", brand: "Milonga" },
        { code: null, name: "Aros Sordo Oriente", brand: "Sordo" },
      ],
      [],
    );
    expect(plan.productsWithoutImage).toEqual([{ productIndex: 1, name: "Aros Sordo Oriente" }]);
  });

  const arosPage = (photos: PhotoFile[]): PdfPageInput => ({
    layout: {
      page: 2,
      texts: [
        { top: 100, left: 54, size: 40, text: "Aros" },
        { top: 302, left: 455, size: 41, text: "Oriente" },
        { top: 464, left: 455, size: 29, text: "Gs. 1" },
        { top: 843, left: 54, size: 41, text: "Puerto" },
        { top: 961, left: 54, size: 29, text: "Gs. 2" },
        { top: 1220, left: 54, size: 11, text: "Imágenes recreadas digitalmente." },
      ],
      images: [],
    },
    photos,
    logosSkipped: 2,
  });
  const aros = {
    pdf: "aros.pdf",
    lotName: "Átika",
    captions: "sections",
    ignoreTokens: ["sordo"],
  } as const;
  const arosProducts = [
    { code: null, name: "Aros Sordo Puerto", brand: "Sordo" },
    { code: null, name: "Aros Sordo Oriente", brand: "Sordo" },
  ];

  it("pairs a two-photo page top to bottom and carries the recreated flag", () => {
    const plan = planPdfLot(aros, arosProducts, [
      arosPage([photo("low.jpg", 681, 490), photo("high.jpg", 162, 54)]),
    ]);
    expect(plan.entries.map((e) => [e.photo.src, e.name, e.recreated])).toEqual([
      ["low.jpg", "Aros Sordo Puerto", true],
      ["high.jpg", "Aros Sordo Oriente", true],
    ]);
  });

  it("reports unpaired captions and photos when a page's counts differ", () => {
    const plan = planPdfLot(aros, arosProducts, [arosPage([photo("one.jpg", 162, 54)])]);
    expect(plan.entries).toEqual([]);
    expect(plan.unmatchedImages).toEqual([
      { page: 2, src: "one.jpg", caption: null, reason: "count-mismatch" },
    ]);
    expect(plan.captionsWithoutImage).toEqual([
      { page: 2, caption: "Aros Oriente" },
      { page: 2, caption: "Aros Puerto" },
    ]);
  });
});
