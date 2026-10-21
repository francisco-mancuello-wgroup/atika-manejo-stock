import { readFile } from "node:fs/promises";
import type { PageLayout, PageText } from "../images-pdf/layout";
import { matchNames } from "../images-pdf/match-names";

/** One entry of the "DIECIOCHO LOOKS" index of the Casa Icona catalog (`atika.pdf`). */
export interface Look {
  number: number;
  name: string;
  description: string | null;
}

/** Lot whose product names are look names rather than garment names. */
export const LOOKS_LOT = "Casa Icona";

const sameLine = (a: PageText, b: PageText) => Math.abs(a.top - b.top) <= 6;

/**
 * Reads the look index: the page titled "Índice" lists, in two columns, a number, the look name
 * to its right, and its one-line description underneath. Text is data only.
 */
export function parseLookIndex(pages: readonly PageLayout[]): Look[] {
  const page = pages.find((p) => p.texts.some((t) => /^[ií]ndice$/i.test(t.text.trim())));
  if (!page) throw new Error("No index page found in the PDF");

  const looks: Look[] = [];
  for (const number of page.texts.filter((t) => /^\d{1,2}$/.test(t.text.trim()))) {
    const name = page.texts
      .filter((t) => t.left > number.left && sameLine(t, number))
      .sort((a, b) => a.left - b.left)[0];
    if (!name) continue;
    const description = page.texts
      .filter((t) => t.left === name.left && t.top > name.top && t.top - name.top < 60)
      .sort((a, b) => a.top - b.top)[0];
    looks.push({
      number: Number(number.text.trim()),
      name: name.text.trim(),
      description: description?.text.trim() ?? null,
    });
  }
  if (looks.length === 0) throw new Error("The index page lists no looks");
  return looks.sort((a, b) => a.number - b.number);
}

/**
 * The look of each product, matched by name with the same rules as the PDF photos (colour
 * translation, generic words dropped). A product no look names unambiguously gets null.
 */
export function matchLooks(
  looks: readonly Look[],
  products: readonly { name: string }[],
): (Look | null)[] {
  const candidates = products.map((p, productIndex) => ({ productIndex, name: p.name }));
  const outcomes = matchNames(
    looks.map((l) => l.name),
    candidates,
  );
  const result: (Look | null)[] = products.map(() => null);
  for (const [i, outcome] of outcomes.entries()) {
    const look = looks[i];
    if (outcome.status === "matched" && look) result[outcome.productIndex] = look;
  }
  return result;
}

/** The committed look index, or null when `pnpm db:export-looks` has not been run. */
export async function readLooks(file: string): Promise<Look[] | null> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const json = JSON.parse(text) as { looks?: Look[] };
  if (!Array.isArray(json.looks)) throw new Error(`${file}: expected a "looks" array`);
  return json.looks;
}
