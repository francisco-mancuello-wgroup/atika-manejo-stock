import { describe, expect, it } from "vitest";
import { CATALOGS, type LookbookRow, lookbookPages, pinkPages } from "./lookbook";

const settings = { showPrices: true, showSoldOutSizes: false };

function row(id: number, overrides: Partial<LookbookRow> = {}): LookbookRow {
  return {
    id: `p${id}`,
    name: `Pieza ${id}`,
    catalogName: null,
    brand: "Milonga",
    lot: { supplier: { name: "Milonga" } },
    category: null,
    color: "Negro",
    description: null,
    priceGs: 1_500_000,
    catalog: "milonga",
    catalogOrder: id,
    catalogSection: "Vestidos",
    variants: [
      { size: "M", stock: 1 },
      { size: "S", stock: 2 },
    ],
    images: [
      { url: `/media/products/p${id}-2.webp`, position: 1 },
      { url: `/media/products/p${id}.webp`, position: 0 },
    ],
    ...overrides,
  };
}

describe("CATALOGS", () => {
  it("shows Casa Icona, Milonga and Sordo, in that order", () => {
    expect(CATALOGS.map((catalog) => catalog.slug)).toEqual(["casa-icona", "milonga", "sordo"]);
  });
});

describe("lookbookPages", () => {
  it("orders pieces by their PDF page and numbers them", () => {
    const pages = lookbookPages([row(3), row(1), row(2)], settings);
    expect(pages.map((page) => [page.pieces[0]?.id, page.page])).toEqual([
      ["p1", 1],
      ["p2", 2],
      ["p3", 3],
    ]);
    expect(pages[0]).toMatchObject({
      title: "Pieza 1",
      brand: "Milonga",
      section: "Vestidos",
      pieces: [
        {
          name: "Pieza 1",
          priceGs: 1_500_000,
          discountPercent: null,
          discountedPriceGs: null,
          sizes: ["S", "M"],
          color: { label: "Negro" },
        },
      ],
      photos: [
        { url: "/media/products/p1.webp", alt: "Pieza 1" },
        { url: "/media/products/p1-2.webp", alt: "Pieza 1" },
      ],
    });
  });

  it("carries the effective discount of each piece and hides it with the price", () => {
    const [page] = lookbookPages([row(1, { discountPercent: 20 })], settings);
    expect(page?.pieces[0]).toMatchObject({
      priceGs: 1_500_000,
      discountPercent: 20,
      discountedPriceGs: 1_200_000,
    });
    const [hidden] = lookbookPages([row(1, { discountPercent: 20 })], { showPrices: false });
    expect(hidden?.pieces[0]).toMatchObject({
      priceGs: null,
      discountPercent: null,
      discountedPriceGs: null,
    });
  });

  it("shows the lookbook name instead of the workbook name", () => {
    const [page] = lookbookPages([row(1, { name: "T Bsc M", catalogName: "Top Bruma" })], settings);
    expect(page?.title).toBe("Top Bruma");
    expect(page?.pieces[0]?.name).toBe("Top Bruma");
  });

  it("drops pieces without stock or photos (si no hay, desaparece)", () => {
    const pages = lookbookPages(
      [row(1), row(2, { variants: [{ size: "M", stock: 0 }] }), row(3, { images: [] })],
      settings,
    );
    expect(pages.map((page) => page.pieces[0]?.id)).toEqual(["p1"]);
  });

  it("lists only the sizes with stock", () => {
    const [page] = lookbookPages(
      [
        row(1, {
          variants: [
            { size: "L", stock: 0 },
            { size: "XS", stock: 1 },
          ],
        }),
      ],
      settings,
    );
    expect(page?.pieces[0]?.sizes).toEqual(["XS"]);
  });

  it("puts the parts of a set that share a PDF page on one page", () => {
    const pages = lookbookPages(
      [
        row(1, { catalogOrder: 28, name: "Top Junio" }),
        row(2, { catalogOrder: 28, name: "Bottom Junio", variants: [{ size: "S", stock: 0 }] }),
        row(3, { catalogOrder: 28, name: "Bottom Junio Largo" }),
        row(4, { catalogOrder: 29 }),
      ],
      settings,
    );
    expect(pages).toHaveLength(2);
    expect(pages[0]?.title).toBe("Top Junio + Bottom Junio Largo");
    expect(pages[0]?.pieces.map((piece) => piece.name)).toEqual([
      "Top Junio",
      "Bottom Junio Largo",
    ]);
    expect(pages.map((page) => page.page)).toEqual([1, 2]);
  });

  it("shows a garment once with its colors when a page has it in several colors", () => {
    const [page] = lookbookPages(
      [
        row(1, { catalogOrder: 16, name: "Falda", color: "Marfil", priceGs: 761_000 }),
        row(2, { catalogOrder: 16, name: "T Bsc M", color: "Negro" }),
        row(3, {
          catalogOrder: 16,
          name: "Falda",
          color: "Negro",
          variants: [{ size: "M", stock: 1 }],
        }),
      ],
      settings,
    );
    expect(page?.title).toBe("Falda + T Bsc M");
    expect(page?.items.map((item) => [item.name, item.options.map((o) => o.id)])).toEqual([
      ["Falda", ["p1", "p3"]],
      ["T Bsc M", ["p2"]],
    ]);
    expect(page?.items[0]?.options[1]).toMatchObject({ color: { label: "Negro" }, sizes: ["M"] });
    expect(page?.photos.find((photo) => photo.url.includes("p3"))?.pieceId).toBe("p3");
  });

  it("hides prices when the store hides them", () => {
    const [page] = lookbookPages([row(1)], { ...settings, showPrices: false });
    expect(page?.pieces[0]?.priceGs).toBeNull();
  });
});

describe("pinkPages", () => {
  it("keeps the pages with a fuchsia or pink piece, numbered again from 1", () => {
    const pages = lookbookPages(
      [
        row(1, { color: "Negro" }),
        row(2, { color: "FUCSIA" }),
        row(3, { color: "Blanco" }),
        row(4, { catalogOrder: 4, name: "Top", color: "Negro" }),
        row(5, { catalogOrder: 4, name: "Falda", color: "Rosa" }),
      ],
      settings,
    );
    const pink = pinkPages(pages);
    expect(pink.map((page) => [page.title, page.page])).toEqual([
      ["Pieza 2", 1],
      ["Top + Falda", 2],
    ]);
  });

  it("is empty when no piece is pink", () => {
    expect(pinkPages(lookbookPages([row(1, { color: "Negro" })], settings))).toEqual([]);
  });
});
