import { normalizeSize } from "./sizes";

/** One sale mentioned in a "VENTAS (fecha)" note. `quantity` is null when the note gives none. */
export interface SalesNoteEntry {
  size: string | null;
  quantity: number | null;
  soldAt: string;
}

const DATE = /(\d{1,2})\/(\d{1,2})\/(\d{4})|(\d{4})-(\d{2})-(\d{2})/g;
// "1 (S) -" or "XS -" immediately before a date.
const SIZE_PREFIX =
  /(?:(\d+)\s*\(\s*([^)\s]+)\s*\)|\b([A-Za-z]{1,2}(?:\/[A-Za-z]{1,2})?|[ÚU]NICO))\s*-?\s*$/;

function isoDate(year: number, month: number, day: number, source: string): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid date in sales note: "${source}"`);
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Splits a free-text sales note into entries, one per date:
 * `23/06/2026 RETIRO X`, `1 (S) - 23/06/2026 RETIRO X`, `XS -16/12/2025   XS -24/12/2025`
 * or an ISO date.
 */
export function parseSalesNote(note: string): SalesNoteEntry[] {
  const entries: SalesNoteEntry[] = [];
  let previousEnd = 0;
  for (const match of note.matchAll(DATE)) {
    const soldAt =
      match[1] !== undefined
        ? isoDate(Number(match[3]), Number(match[2]), Number(match[1]), match[0])
        : isoDate(Number(match[4]), Number(match[5]), Number(match[6]), match[0]);

    const prefix = note.slice(previousEnd, match.index);
    const sized = SIZE_PREFIX.exec(prefix);
    let size: string | null = null;
    let quantity: number | null = null;
    if (sized) {
      const candidate = normalizeSize(sized[2] ?? sized[3] ?? "");
      if (candidate) {
        size = candidate;
        quantity = sized[1] !== undefined ? Number(sized[1]) : 1;
      }
    }
    entries.push({ size, quantity, soldAt });
    previousEnd = (match.index ?? 0) + match[0].length;
  }
  return entries;
}
