import type ExcelJS from "exceljs";
import {
  cellNumber,
  cellText,
  cellValue,
  collapse,
  isStruck,
  normalizeLabel,
  toIsoDate,
} from "./cells";
import { parseSalesNote, type SalesNoteEntry } from "./notes";
import { normalizeSize } from "./sizes";

export type { SalesNoteEntry } from "./notes";
export { parseSalesNote } from "./notes";

export type Shipping =
  | { kind: "none" }
  | { kind: "usd"; amount: number }
  | { kind: "gs"; amount: number };

/** What the workbook cannot tell us: who the supplier is and what the lot paid for shipping. */
export interface LotOptions {
  supplier: string;
  lotName: string;
  shipping: Shipping;
  saleFactor: number;
  vatRate: number;
  /** ISO date; defaults to the workbook creation date. */
  purchasedAt?: string;
}

export interface ParsedVariant {
  size: string;
  unitsBought: number;
  sold: number;
}

export interface ParsedProduct {
  code: string | null;
  name: string;
  brand: string | null;
  color: string | null;
  originalValueUsd: number;
  variants: ParsedVariant[];
}

export interface ParsedSale {
  productIndex: number;
  size: string;
  quantity: number;
  /** ISO date, or null when the workbook gives none. */
  soldAt: string | null;
  note: string | null;
}

export interface ParsedLot {
  supplier: string;
  lotName: string;
  purchasedAt: string | null;
  exchangeRate: number;
  saleFactor: number;
  vatRate: number;
  costRate: number;
  totalShippingUsd: number;
  products: ParsedProduct[];
  sales: ParsedSale[];
  warnings: string[];
}

interface Columns {
  name: number | null;
  code: number | null;
  color: number | null;
  brand: number | null;
  original: number | null;
  quantity: number | null;
  unitCost: number;
  sales: number | null;
  fx: { usd: number; gs: number } | null;
  /** Size columns with their canonical size; empty for the one-row-per-size layout. */
  sizeColumns: { col: number; size: string }[];
  /** The "TALLES" column of the one-row-per-size layout. */
  sizeColumn: number | null;
  firstDataRow: number;
}

interface SizeUnits {
  size: string;
  units: number;
  struck: number;
}

interface Entry {
  row: number;
  code: string | null;
  name: string;
  brand: string | null;
  color: string | null;
  original: number | null;
  unitCost: number;
  exchangeRate: number | null;
  sizes: SizeUnits[];
  note: string | null;
  noteEntries: SalesNoteEntry[];
}

const FX_PAIRS: [string, string][] = [
  ["PRECIO UNITARIO USD", "PRECIO UNITARIO GS"],
  ["COSTO UNITARIO USD", "COSTO UNITARIO GS"],
];

function findHeaderRow(sheet: ExcelJS.Worksheet): number {
  const limit = Math.min(sheet.rowCount, 8);
  for (let r = 1; r <= limit; r++) {
    let found = false;
    sheet.getRow(r).eachCell((cell) => {
      const text = cellText(cell);
      if (text && normalizeLabel(text) === "CANTIDAD") found = true;
    });
    if (found) return r;
  }
  throw new Error('No header row with a "CANTIDAD" column found in the first rows of the sheet');
}

function rowLabels(sheet: ExcelJS.Worksheet, rowNumber: number): Map<number, string> {
  const labels = new Map<number, string>();
  sheet.getRow(rowNumber).eachCell((cell, col) => {
    const text = cellText(cell);
    if (text) labels.set(col, normalizeLabel(text));
  });
  return labels;
}

function detectColumns(sheet: ExcelJS.Worksheet): Columns {
  const headerRow = findHeaderRow(sheet);
  const labels = rowLabels(sheet, headerRow);
  const below = rowLabels(sheet, headerRow + 1);

  // Merged header cells repeat their label on the row below; plain data rows do not.
  let repeated = 0;
  for (const [col, label] of labels) if (below.get(col) === label) repeated++;
  const twoRowHeader = repeated >= 2;

  const first = (...candidates: string[]): number | null => {
    for (const candidate of candidates) {
      for (const [col, label] of labels) if (label === candidate) return col;
    }
    return null;
  };

  const unitCost = first("COSTO UNITARIO USD");
  if (unitCost === null) throw new Error('Header has no "COSTO UNITARIO USD" column');

  let fx: Columns["fx"] = null;
  for (const [usdLabel, gsLabel] of FX_PAIRS) {
    const usd = first(usdLabel);
    const gs = first(gsLabel);
    if (usd !== null && gs !== null) {
      fx = { usd, gs };
      break;
    }
  }

  const sizeLabelCols = [...labels].filter(([, label]) => label.startsWith("TALL")).map(([c]) => c);
  const sizeColumns: Columns["sizeColumns"] = [];
  let sizeColumn: number | null = null;
  if (twoRowHeader) {
    for (const col of sizeLabelCols) {
      const raw = below.get(col);
      const size = raw ? normalizeSize(raw) : null;
      if (!size) throw new Error(`Unrecognized size "${raw ?? ""}" in size header column ${col}`);
      sizeColumns.push({ col, size });
    }
  } else {
    sizeColumn = sizeLabelCols[0] ?? null;
  }
  if (sizeColumns.length === 0 && sizeColumn === null) {
    throw new Error("Header has no size columns");
  }

  let sales: number | null = null;
  for (const [col, label] of labels) if (label.startsWith("VENTAS")) sales = col;

  return {
    name: first("DESCRIPCION", "NOMBRE"),
    code: first("CODIGO", "REFERENCIA"),
    color: first("COLOR"),
    brand: first("MARCA"),
    original: first("VALOR ORIGINAL"),
    quantity: first("CANTIDAD"),
    unitCost,
    sales,
    fx,
    sizeColumns,
    sizeColumn,
    firstDataRow: headerRow + (twoRowHeader ? 2 : 1),
  };
}

function optionalText(row: ExcelJS.Row, col: number | null): string | null {
  return col === null ? null : cellText(row.getCell(col));
}

function readNote(
  row: ExcelJS.Row,
  col: number | null,
): { note: string | null; entries: SalesNoteEntry[] } {
  if (col === null) return { note: null, entries: [] };
  const cell = row.getCell(col);
  const value = cellValue(cell);
  if (value instanceof Date) {
    return { note: null, entries: [{ size: null, quantity: null, soldAt: toIsoDate(value) }] };
  }
  const text = cellText(cell);
  if (!text) return { note: null, entries: [] };
  return { note: text, entries: parseSalesNote(text) };
}

function readEntry(row: ExcelJS.Row, columns: Columns, warnings: string[]): Entry | null {
  const sizes: SizeUnits[] = [];
  let unitCost = cellNumber(row.getCell(columns.unitCost));

  if (columns.sizeColumn !== null) {
    // One row per size: the quantity column holds this size's count and the "unit cost" holds
    // the row's total cost, so it is divided by the quantity.
    const sizeCell = row.getCell(columns.sizeColumn);
    const rawSize = cellText(sizeCell);
    if (!rawSize) return null;
    const size = normalizeSize(rawSize);
    if (!size) throw new Error(`Row ${row.number}: unrecognized size "${rawSize}"`);
    const quantityCell = row.getCell(columns.quantity ?? 0);
    const units = cellNumber(quantityCell);
    if (!units || units <= 0) return null;
    sizes.push({
      size,
      units,
      struck: isStruck(sizeCell) || isStruck(quantityCell) ? units : 0,
    });
    if (unitCost !== null) unitCost = Math.round((unitCost / units) * 10_000) / 10_000;
  } else {
    for (const { col, size } of columns.sizeColumns) {
      const cell = row.getCell(col);
      const units = cellNumber(cell);
      if (units && units > 0) sizes.push({ size, units, struck: isStruck(cell) ? units : 0 });
    }
    if (sizes.length === 0) return null;
    const declared = columns.quantity === null ? null : cellNumber(row.getCell(columns.quantity));
    const total = sizes.reduce((sum, s) => sum + s.units, 0);
    if (declared !== null && declared !== total) {
      warnings.push(
        `Row ${row.number}: quantity column says ${declared} but sizes add up to ${total}; using sizes`,
      );
    }
  }

  if (unitCost === null || unitCost < 0) {
    throw new Error(`Row ${row.number}: missing unit cost for a row with stock`);
  }

  const brand = optionalText(row, columns.brand);
  const code = optionalText(row, columns.code);
  let name = optionalText(row, columns.name);
  if (!name) {
    if (brand) {
      name = `Sin nombre (${brand})`;
      warnings.push(`Row ${row.number}: no name, using "${name}"`);
    } else if (code) {
      name = code;
    } else {
      throw new Error(`Row ${row.number}: has stock but no name, code or brand`);
    }
  }

  let exchangeRate: number | null = null;
  if (columns.fx) {
    const usd = cellNumber(row.getCell(columns.fx.usd));
    const gs = cellNumber(row.getCell(columns.fx.gs));
    if (usd && gs && usd > 0) exchangeRate = Math.round(gs / usd);
  }

  const { note, entries } = readNote(row, columns.sales);
  return {
    row: row.number,
    code,
    name,
    brand,
    color: optionalText(row, columns.color),
    original: columns.original === null ? null : cellNumber(row.getCell(columns.original)),
    unitCost,
    exchangeRate,
    sizes,
    note,
    noteEntries: entries,
  };
}

function mostCommonRate(entries: Entry[], warnings: string[]): number {
  const counts = new Map<number, number>();
  for (const entry of entries) {
    if (entry.exchangeRate)
      counts.set(entry.exchangeRate, (counts.get(entry.exchangeRate) ?? 0) + 1);
  }
  let best: number | null = null;
  for (const [rate, count] of counts) {
    if (best === null || count > (counts.get(best) ?? 0)) best = rate;
  }
  if (best === null)
    throw new Error("Could not derive an exchange rate from the Gs and USD columns");
  for (const entry of entries) {
    if (entry.exchangeRate && entry.exchangeRate !== best) {
      warnings.push(
        `Row ${entry.row}: exchange rate ${entry.exchangeRate} differs from the lot rate ${best}`,
      );
    }
  }
  return best;
}

/** One cost rate for the lot when every row agrees, otherwise 1 with the unit cost as value. */
function resolveCostRate(entries: Entry[], warnings: string[]): number {
  const withOriginal = entries.filter((e) => e.original !== null && e.original > 0);
  if (withOriginal.length === 0 || withOriginal.length !== entries.length) return 1;
  const ratios = new Set(withOriginal.map((e) => (e.unitCost / (e.original ?? 1)).toFixed(4)));
  if (ratios.size === 1) return Number([...ratios][0]);
  warnings.push(
    "Unit cost is not a constant share of the original value: using cost rate 1 and the unit cost as value",
  );
  return 1;
}

function productKey(entry: Entry, original: number): string {
  return JSON.stringify([
    entry.code,
    entry.name,
    entry.brand,
    entry.color,
    original,
    entry.unitCost,
  ]);
}

function resolveSales(entry: Entry, productIndex: number): ParsedSale[] {
  const sales: ParsedSale[] = [];
  const boughtSizes = new Set(entry.sizes.map((s) => s.size));
  for (const noted of entry.noteEntries) {
    if (noted.size && !boughtSizes.has(noted.size)) {
      throw new Error(
        `Row ${entry.row}: sales note mentions size ${noted.size}, which the row does not have`,
      );
    }
  }
  const unsized = entry.noteEntries.filter((n) => n.size === null);

  for (const { size, units, struck } of entry.sizes) {
    const sized = entry.noteEntries.filter((n) => n.size === size);
    const noted = sized.reduce((sum, n) => sum + (n.quantity ?? 1), 0);
    const total = Math.max(struck, noted);
    if (total > units) {
      throw new Error(`Row ${entry.row}: ${total} sold of size ${size} but only ${units} bought`);
    }
    for (const n of sized) {
      sales.push({
        productIndex,
        size,
        quantity: n.quantity ?? 1,
        soldAt: n.soldAt,
        note: entry.note,
      });
    }
    let remaining = total - noted;
    let next = 0;
    while (remaining > 0) {
      const dated = unsized[next];
      const last = next >= unsized.length - 1;
      const quantity = last ? remaining : 1;
      sales.push({
        productIndex,
        size,
        quantity,
        soldAt: dated?.soldAt ?? unsized.at(-1)?.soldAt ?? null,
        note: entry.note,
      });
      remaining -= quantity;
      next++;
    }
  }
  return sales;
}

/**
 * Normalizes one inventory workbook into a lot. Pure: no I/O, no database.
 *
 * Handles both layouts found in the supplier workbooks: one row per size with a quantity
 * column, and one row per model with a column per size.
 */
export function parseInventoryWorkbook(workbook: ExcelJS.Workbook, options: LotOptions): ParsedLot {
  const sheet = workbook.worksheets.find((s) => s.rowCount > 0);
  if (!sheet) throw new Error("Workbook has no sheet with data");

  const warnings: string[] = [];
  const columns = detectColumns(sheet);

  const entries: Entry[] = [];
  for (let r = columns.firstDataRow; r <= sheet.rowCount; r++) {
    const entry = readEntry(sheet.getRow(r), columns, warnings);
    if (entry) entries.push(entry);
  }

  const exchangeRate = mostCommonRate(entries, warnings);
  const costRate = resolveCostRate(entries, warnings);

  const products: ParsedProduct[] = [];
  const sales: ParsedSale[] = [];
  let lastKey: string | null = null;
  for (const entry of entries) {
    const original = costRate === 1 || entry.original === null ? entry.unitCost : entry.original;
    const key = productKey(entry, original);
    if (key !== lastKey) {
      products.push({
        code: entry.code,
        name: collapse(entry.name),
        brand: entry.brand,
        color: entry.color,
        originalValueUsd: original,
        variants: [],
      });
      lastKey = key;
    }
    const productIndex = products.length - 1;
    const product = products[productIndex];
    if (!product) continue;
    const entrySales = resolveSales(entry, productIndex);
    for (const { size, units } of entry.sizes) {
      const sold = entrySales
        .filter((s) => s.size === size)
        .reduce((sum, s) => sum + s.quantity, 0);
      const existing = product.variants.find((v) => v.size === size);
      if (existing) {
        existing.unitsBought += units;
        existing.sold += sold;
      } else {
        product.variants.push({ size, unitsBought: units, sold });
      }
    }
    sales.push(...entrySales);
  }

  const purchasedAt =
    options.purchasedAt ?? (workbook.created ? toIsoDate(workbook.created) : null);
  const shipping = options.shipping;
  const totalShippingUsd =
    shipping.kind === "none"
      ? 0
      : shipping.kind === "usd"
        ? shipping.amount
        : Math.round((shipping.amount / exchangeRate) * 100) / 100;

  return {
    supplier: options.supplier,
    lotName: options.lotName,
    purchasedAt,
    exchangeRate,
    saleFactor: options.saleFactor,
    vatRate: options.vatRate,
    costRate,
    totalShippingUsd,
    products,
    sales,
    warnings,
  };
}
