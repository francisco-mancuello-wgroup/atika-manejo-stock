import type ExcelJS from "exceljs";

/** Collapses runs of whitespace (including newlines) and trims. */
export function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Uppercase, accent-free, whitespace-collapsed form used to match header labels. */
export function normalizeLabel(text: string): string {
  return collapse(text)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();
}

/** The value a spreadsheet shows: formula results, rich text and hyperlinks resolved. */
export function cellValue(cell: ExcelJS.Cell): string | number | Date | null {
  const value = cell.value;
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || value instanceof Date) return value;
  if (typeof value === "boolean") return null;
  if ("result" in value) {
    const result = value.result;
    if (typeof result === "string" || typeof result === "number" || result instanceof Date) {
      return result;
    }
    return null;
  }
  if ("richText" in value) return value.richText.map((run) => run.text).join("");
  if ("text" in value && typeof value.text === "string") return value.text;
  return null;
}

export function cellText(cell: ExcelJS.Cell): string | null {
  const value = cellValue(cell);
  if (typeof value === "string") return collapse(value) || null;
  if (typeof value === "number") return String(value);
  return null;
}

export function cellNumber(cell: ExcelJS.Cell): number | null {
  const value = cellValue(cell);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** True when the cell is struck through, including a struck run inside rich text. */
export function isStruck(cell: ExcelJS.Cell): boolean {
  if (cell.font?.strike) return true;
  const value = cell.value;
  if (value && typeof value === "object" && "richText" in value) {
    return value.richText.some((run) => run.font?.strike === true && run.text.trim() !== "");
  }
  return false;
}

/** Date-only ISO string (UTC) for a Date cell. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
