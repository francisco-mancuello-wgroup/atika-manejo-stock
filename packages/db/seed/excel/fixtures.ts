import ExcelJS from "exceljs";

/** A cell in a test grid: a bare value, or a value with font flags. */
export type TestCell =
  | string
  | number
  | Date
  | null
  | { value: string | number | Date | { formula: string; result: number }; strike?: boolean };

/** Builds a one-sheet in-memory workbook; `rows[0]` is spreadsheet row 1. */
export function buildWorkbook(rows: TestCell[][], created?: Date): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  if (created) workbook.created = created;
  const sheet = workbook.addWorksheet("INVENTARIO");
  rows.forEach((cells, rowIndex) => {
    cells.forEach((cell, colIndex) => {
      if (cell === null) return;
      const target = sheet.getCell(rowIndex + 1, colIndex + 1);
      if (typeof cell === "object" && !(cell instanceof Date)) {
        target.value = cell.value;
        if (cell.strike) target.font = { strike: true };
      } else {
        target.value = cell;
      }
    });
  });
  return workbook;
}
