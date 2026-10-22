import { sortSizes } from "../sizes";

/** Label stock in millimetres. Change it here when the real label roll is known. */
export const LABEL_SIZE_MM = { width: 50, height: 25 } as const;

export type LabelSizeMm = { readonly width: number; readonly height: number };

/** Guard against a typo printing thousands of labels from one size. */
export const MAX_COPIES_PER_SIZE = 200;

export interface LabelVariant {
  size: string;
  barcode: string;
  stock: number;
}

export interface LabelSelection {
  size: string;
  copies: number;
}

export interface LabelContent {
  name: string;
  size: string;
  priceGs: number;
  barcode: string;
}

/** Form field that holds the copies of one size. */
export const copiesField = (size: string) => `copies-${size}`;

/** `copies-<size>` fields to selections in size order; blank, invalid or zero copies are dropped. */
export function parseCopies(
  params: URLSearchParams,
  variants: readonly LabelVariant[],
): LabelSelection[] {
  const selection: LabelSelection[] = [];
  for (const size of sortSizes(variants.map((variant) => variant.size))) {
    const raw = params.get(copiesField(size))?.trim() ?? "";
    if (!/^\d+$/.test(raw)) continue;
    const copies = Math.min(Number(raw), MAX_COPIES_PER_SIZE);
    if (copies > 0) selection.push({ size, copies });
  }
  return selection;
}

/** The label shows the catalog name when there is one. */
export function labelName(product: { name: string; catalogName: string | null }): string {
  return product.catalogName?.trim() || product.name;
}

/** One label per copy, in the order of the selection. */
export function expandLabels(
  product: { name: string; catalogName: string | null; priceGs: number },
  variants: readonly LabelVariant[],
  selection: readonly LabelSelection[],
): LabelContent[] {
  const barcodes = new Map(variants.map((variant) => [variant.size, variant.barcode]));
  return selection.flatMap(({ size, copies }) => {
    const barcode = barcodes.get(size);
    if (!barcode) return [];
    const label = { name: labelName(product), size, priceGs: product.priceGs, barcode };
    return Array.from({ length: copies }, () => ({ ...label }));
  });
}

/** Truncates with an ellipsis until `measure(text)` fits in `maxWidth`. */
export function fitText(text: string, maxWidth: number, measure: (text: string) => number): string {
  if (measure(text) <= maxWidth) return text;
  let end = text.length;
  while (end > 0 && measure(`${text.slice(0, end).trimEnd()}…`) > maxWidth) end -= 1;
  return `${text.slice(0, end).trimEnd()}…`;
}

/** Alternating bar/space widths (bar first) to the bars' start and width, in modules. */
export function barRuns(widths: readonly number[]): { start: number; width: number }[] {
  const runs: { start: number; width: number }[] = [];
  let start = 0;
  widths.forEach((width, index) => {
    if (index % 2 === 0) runs.push({ start, width });
    start += width;
  });
  return runs;
}
