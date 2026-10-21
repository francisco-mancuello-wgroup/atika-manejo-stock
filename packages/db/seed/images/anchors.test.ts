import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { extractSheetImages } from "./anchors";
import { forExcel, solidPng } from "./test-helpers";

describe("extractSheetImages", () => {
  it("returns each drawing with its 1-based top-left anchor row, sorted by position", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("INVENTARIO");
    sheet.getCell("B6").value = "x";
    const a = workbook.addImage({
      buffer: forExcel(await solidPng(10, 10, "#ff0000")),
      extension: "png",
    });
    const b = workbook.addImage({
      buffer: forExcel(await solidPng(10, 10, "#00ff00")),
      extension: "png",
    });
    // exceljs anchors are 0-based: row 4 is spreadsheet row 5.
    sheet.addImage(b, { tl: { col: 0, row: 4 }, ext: { width: 10, height: 10 } });
    sheet.addImage(a, { tl: { col: 0, row: 2.9 }, ext: { width: 10, height: 10 } });

    const images = extractSheetImages(workbook, sheet);
    expect(images.map((i) => [i.row, i.col])).toEqual([
      [3, 1],
      [5, 1],
    ]);
    expect(images.every((i) => i.extension === "png" && i.buffer.length > 0)).toBe(true);
  });

  it("returns nothing for a sheet without drawings", () => {
    const workbook = new ExcelJS.Workbook();
    expect(extractSheetImages(workbook, workbook.addWorksheet("S"))).toEqual([]);
  });
});
