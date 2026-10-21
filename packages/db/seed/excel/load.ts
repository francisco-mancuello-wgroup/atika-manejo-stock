import { readdir } from "node:fs/promises";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { normalizeLabel } from "./cells";
import { type LotOptions, type ParsedLot, parseInventoryWorkbook } from "./parse";

export interface WorkbookSource {
  /** Matched against the normalized file name. */
  fileMatch: string;
  options: LotOptions;
}

/** Fixed lot facts that the workbooks do not carry (shipping totals come from the headers). */
export const WORKBOOK_SOURCES: readonly WorkbookSource[] = [
  {
    fileMatch: "CASA ICONA",
    options: {
      supplier: "Casa Icona",
      lotName: "Casa Icona",
      shipping: { kind: "usd", amount: 2265.12 },
      saleFactor: 2.5,
      vatRate: 0.1,
    },
  },
  {
    fileMatch: "MILONGA",
    options: {
      supplier: "Milonga",
      lotName: "Milonga",
      shipping: { kind: "gs", amount: 9_000_000 },
      saleFactor: 2.5,
      vatRate: 0.1,
    },
  },
  {
    fileMatch: "ZUNILDA",
    options: {
      supplier: "Zunilda Gutierrez",
      lotName: "Zunilda Gutierrez",
      shipping: { kind: "gs", amount: 5_150_000 },
      saleFactor: 2.5,
      vatRate: 0.1,
    },
  },
  {
    fileMatch: "ATIKA",
    options: {
      supplier: "Átika",
      lotName: "Átika",
      shipping: { kind: "none" },
      saleFactor: 2.5,
      vatRate: 0.1,
    },
  },
];

/** Reads every configured workbook from `dir` and parses it into a lot. */
export async function loadLots(dir: string): Promise<ParsedLot[]> {
  const files = (await readdir(dir)).filter(
    (file) => file.toLowerCase().endsWith(".xlsx") && !file.startsWith("~$"),
  );
  const lots: ParsedLot[] = [];
  for (const source of WORKBOOK_SOURCES) {
    const matches = files.filter((file) => normalizeLabel(file).includes(source.fileMatch));
    const [file] = matches;
    if (matches.length !== 1 || file === undefined) {
      throw new Error(
        `Expected exactly one workbook matching "${source.fileMatch}" in ${dir}, found ${matches.length}`,
      );
    }
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(join(dir, file));
    lots.push(parseInventoryWorkbook(workbook, source.options));
  }
  return lots;
}
