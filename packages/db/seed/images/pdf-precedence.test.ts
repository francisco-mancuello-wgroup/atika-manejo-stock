import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ParsedLot, ParsedProduct } from "../excel/parse";
import { parsePdfManifest } from "../images-pdf/pdf-manifest";
import type { Manifest, ManifestImage } from "./manifest";
import { mediaFilesFor, mergeImagePlans, planProductImages, readPdfManifest } from "./seed-images";

const product = (name: string): ParsedProduct => ({
  code: null,
  name,
  brand: null,
  color: null,
  originalValueUsd: 1,
  variants: [],
  sourceRows: [],
});

const lots = [
  { lotName: "Átika", products: [product("Top"), product("Falda"), product("Sin foto")] },
] as ParsedLot[];

const image = (over: Partial<ManifestImage>): ManifestImage => ({
  productIndex: 0,
  code: null,
  name: "Top",
  file: "atika/top.webp",
  position: 0,
  sourceRow: 2,
  sourceFormat: "png",
  width: 1,
  height: 1,
  bytes: 1,
  sourceBytes: 1,
  ...over,
});

const manifest = (images: ManifestImage[]): Manifest => ({
  version: 1,
  lots: [{ lot: "Átika", slug: "atika", images, unmatchedImages: [], productsWithoutImage: [] }],
});

const workbook = () =>
  planProductImages(
    manifest([
      image({ file: "atika/top.webp" }),
      image({ productIndex: 1, name: "Falda", file: "atika/falda.webp" }),
    ]),
    lots,
  );
const pdf = () =>
  planProductImages(manifest([image({ file: "atika/top-pdf.webp" })]), lots, "brand-pdf");

describe("brand PDF photos in the seed", () => {
  it("serves PDF photos from their own media folder", () => {
    expect(pdf().get("Átika", 0)).toEqual([
      { url: "/media/products/brand-pdf/atika/top-pdf.webp", alt: "Top", position: 0 },
    ]);
  });

  it("prefers a product's PDF photos and keeps workbook photos only where there are none", () => {
    const merged = mergeImagePlans(pdf(), workbook());
    expect(merged.get("Átika", 0).map((i) => [i.url, i.position])).toEqual([
      ["/media/products/brand-pdf/atika/top-pdf.webp", 0],
    ]);
    expect(merged.get("Átika", 1).map((i) => i.url)).toEqual(["/media/products/atika/falda.webp"]);
    expect(merged.get("Átika", 2)).toEqual([]);
  });

  it("lists the files to copy from the right source folder, only for photos in use", () => {
    const files = mediaFilesFor(mergeImagePlans(pdf(), workbook()), lots, [
      { urlPrefix: "/media/products/brand-pdf", dir: "/pdf" },
      { urlPrefix: "/media/products", dir: "/wb" },
    ]);
    expect(files).toEqual([
      { from: "/pdf/atika/top-pdf.webp", to: "brand-pdf/atika/top-pdf.webp" },
      { from: "/wb/atika/falda.webp", to: "atika/falda.webp" },
    ]);
  });

  it("ignores unassigned PDF photos: only matched ones are linked and copied", () => {
    const plan = planProductImages(
      manifest([image({ file: "atika/top-pdf.webp" })]),
      lots,
      "brand-pdf",
    );
    // The PDF manifest lists unassigned photos under sin-asignar/, but the seed reads `images` only.
    const pdfManifest = {
      version: 1,
      lots: [
        {
          lot: "Átika",
          slug: "atika",
          pdf: "a.pdf",
          images: [],
          unmatchedImages: [
            {
              page: 1,
              caption: null,
              reason: "no-caption",
              file: "sin-asignar/atika/p01-sin-texto.webp",
            },
          ],
          captionsWithoutImage: [],
          productsWithoutImage: [],
          stats: { imagesFound: 1, logosSkipped: 0, matched: 0, unmatched: 1 },
        },
      ],
    };
    expect(parsePdfManifest(pdfManifest).lots[0]?.unmatchedImages).toHaveLength(1);
    const files = mediaFilesFor(plan, lots, [
      { urlPrefix: "/media/products/brand-pdf", dir: "/pdf" },
    ]);
    expect(files.map((f) => f.to)).toEqual(["brand-pdf/atika/top-pdf.webp"]);
    expect(files.some((f) => f.to.includes("sin-asignar"))).toBe(false);
  });

  it("refuses a photo url that no source folder serves", () => {
    const stray = { get: () => [{ url: "/elsewhere/x.webp", alt: "x", position: 0 }] };
    expect(() =>
      mediaFilesFor(stray, lots, [{ urlPrefix: "/media/products", dir: "/wb" }]),
    ).toThrow(/elsewhere/);
  });

  it("readPdfManifest returns null without a manifest and parses the one on disk", async () => {
    const dir = await mkdtemp(join(tmpdir(), "atika-pdf-manifest-"));
    try {
      expect(await readPdfManifest(dir)).toBeNull();
      await writeFile(
        join(dir, "manifest.json"),
        JSON.stringify({
          version: 1,
          lots: [
            {
              lot: "Átika",
              slug: "atika",
              pdf: "a.pdf",
              images: [
                {
                  productIndex: 0,
                  code: null,
                  name: "Top",
                  file: "atika/top-pdf.webp",
                  position: 0,
                  page: 2,
                  caption: "Top",
                  rule: "exact",
                  recreated: true,
                  sourceFormat: "jpg",
                  width: 1,
                  height: 1,
                  bytes: 1,
                  sourceBytes: 1,
                },
              ],
              unmatchedImages: [],
              captionsWithoutImage: [],
              productsWithoutImage: [],
              stats: { imagesFound: 1, logosSkipped: 0, matched: 1, unmatched: 0 },
            },
          ],
        }),
      );
      expect((await readPdfManifest(dir))?.lots[0]?.images[0]?.recreated).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
