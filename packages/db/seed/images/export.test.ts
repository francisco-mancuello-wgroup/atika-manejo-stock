import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type ExcelJS from "exceljs";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { buildWorkbook, type TestCell } from "../excel/fixtures";
import { findDataSheet, parseInventoryWorkbook } from "../excel/parse";
import { extractSheetImages } from "./anchors";
import { planLotImages, writeExport } from "./export";
import { parseManifest } from "./manifest";
import { forExcel, solidPng } from "./test-helpers";

const OPTIONS = {
  supplier: "Test Supplier",
  lotName: "Casa Icona",
  shipping: { kind: "none" },
  saleFactor: 2.5,
  vatRate: 0.1,
} as const;

const HEADER: TestCell[] = [
  "PHOTO",
  "DESCRIPCION",
  "VALOR ORIGINAL",
  "TALLES",
  "CANTIDAD",
  "COSTO UNITARIO USD",
  "COSTO TOTAL USD",
  "PRECIO UNITARIO USD",
  "PRECIO UNITARIO Gs",
  "VENTAS (fecha)",
];

/** Rows: 1 header, 2-3 SOLEIL (two sizes), 4 BLACK, 5 LUNA (no image), 6 totals. */
async function workbookWithImages(imageRows: number[]): Promise<ExcelJS.Workbook> {
  const workbook = buildWorkbook([
    HEADER,
    [null, "COSTA SOLEIL", 120, "XS", 1, 66, 66, 300, 2102700, null],
    [null, "COSTA SOLEIL", 120, "S", 1, 66, 66, 300, 2102700, null],
    [null, "COSTA BLACK", 100, "M", 1, 55, 55, 300, 2102700, null],
    [null, "COSTA LUNA", 90, "M", 1, 49.5, 49.5, 300, 2102700, null],
    [null, null, null, null, 4, null, 236.5, null, null, null],
  ]);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("no sheet");
  for (const [index, row] of imageRows.entries()) {
    const id = workbook.addImage({
      buffer: forExcel(await solidPng(40 + index, 60, "#aa5533")),
      extension: "png",
    });
    sheet.addImage(id, { tl: { col: 0, row: row - 1 }, ext: { width: 40, height: 60 } });
  }
  return workbook;
}

function plan(workbook: ExcelJS.Workbook) {
  const lot = parseInventoryWorkbook(workbook, OPTIONS);
  const sheet = findDataSheet(workbook);
  return planLotImages(lot.lotName, lot.products, extractSheetImages(workbook, sheet));
}

describe("planLotImages", () => {
  it("maps anchors to the seed's products and names the files", async () => {
    const result = plan(await workbookWithImages([3, 4]));
    expect(result.slug).toBe("casa-icona");
    expect(
      result.entries.map((e) => [e.productIndex, e.name, e.file, e.position, e.sourceRow]),
    ).toEqual([
      [0, "COSTA SOLEIL", "casa-icona/costa-soleil.webp", 0, 3],
      [1, "COSTA BLACK", "casa-icona/costa-black.webp", 0, 4],
    ]);
  });

  it("reports unmatched images and products without image", async () => {
    // Row 1 is the header and row 6 the totals row: neither is a product.
    const result = plan(await workbookWithImages([1, 2, 4, 6]));
    expect(result.unmatchedImages.map((i) => i.row)).toEqual([1, 6]);
    expect(result.productsWithoutImage).toEqual([{ productIndex: 2, name: "COSTA LUNA" }]);
  });
});

describe("writeExport", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
  });
  const tempDir = async () => {
    const dir = await mkdtemp(join(tmpdir(), "atika-images-"));
    dirs.push(dir);
    return dir;
  };

  it("writes optimized WebP files and a manifest that parses back", async () => {
    const out = await tempDir();
    const manifest = await writeExport(out, [plan(await workbookWithImages([2, 4]))]);

    expect(await readdir(join(out, "casa-icona"))).toEqual([
      "costa-black.webp",
      "costa-soleil.webp",
    ]);
    const meta = await sharp(join(out, "casa-icona", "costa-soleil.webp")).metadata();
    expect(meta.format).toBe("webp");

    const onDisk = parseManifest(JSON.parse(await readFile(join(out, "manifest.json"), "utf8")));
    expect(onDisk).toEqual(manifest);
    const [lot] = onDisk.lots;
    expect(lot?.images[0]).toMatchObject({
      productIndex: 0,
      name: "COSTA SOLEIL",
      file: "casa-icona/costa-soleil.webp",
      position: 0,
      sourceFormat: "png",
      width: 40,
      height: 60,
    });
    expect(lot?.productsWithoutImage).toEqual([{ productIndex: 2, name: "COSTA LUNA" }]);
  });

  it("cleans the folder first and is deterministic across runs", async () => {
    const out = await tempDir();
    const workbook = await workbookWithImages([2, 4]);
    await writeExport(out, [plan(workbook)]);
    const first = await readFile(join(out, "casa-icona", "costa-soleil.webp"));
    const firstManifest = await readFile(join(out, "manifest.json"), "utf8");

    await writeExport(out, [plan(await workbookWithImages([4]))]);
    expect(await readdir(join(out, "casa-icona"))).toEqual(["costa-black.webp"]);

    await writeExport(out, [plan(workbook)]);
    expect((await readFile(join(out, "casa-icona", "costa-soleil.webp"))).equals(first)).toBe(true);
    expect(await readFile(join(out, "manifest.json"), "utf8")).toBe(firstManifest);
  });
});
