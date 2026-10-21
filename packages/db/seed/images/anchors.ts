import type ExcelJS from "exceljs";
import type { SheetImage } from "./match";

/**
 * Every floating drawing on a sheet, with the spreadsheet row (1-based) of its top-left anchor.
 *
 * An image that straddles several rows belongs to the row where its top-left corner sits, never
 * to the rows it merely overlaps. Sorted by row, column and media id so later steps are
 * deterministic.
 */
export function extractSheetImages(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
): SheetImage[] {
  const images: SheetImage[] = [];
  for (const placed of sheet.getImages()) {
    const media = workbook.getImage(Number(placed.imageId));
    if (!media?.buffer) throw new Error(`Drawing ${placed.imageId} has no image data`);
    const { tl } = placed.range;
    images.push({
      row: (tl.nativeRow ?? Math.floor(tl.row)) + 1,
      col: (tl.nativeCol ?? Math.floor(tl.col)) + 1,
      imageId: Number(placed.imageId),
      extension: media.extension,
      buffer: Buffer.from(media.buffer),
    });
  }
  return images.sort((a, b) => a.row - b.row || a.col - b.col || a.imageId - b.imageId);
}
