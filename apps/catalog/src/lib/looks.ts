import data from "../../../../data/catalog-categories/casa-icona-looks.json";

/** One entry of the "DIECIOCHO LOOKS" index of the Casa Icona catalog. */
export interface Look {
  number: number;
  name: string;
  description: string | null;
}

/** The committed look index (`pnpm db:export-looks`). */
export const LOOKS: readonly Look[] = data.looks;

/** Supplier whose product names are look names. */
export const LOOKS_SUPPLIER = "Casa Icona";

// Same normalization as the seed that matches the PDF photos (packages/db/seed/images-pdf).
const SYNONYMS: Record<string, string> = { black: "negro", white: "blanco" };
const GENERIC = new Set(["dress", "mini", "tamano"]);

function tokens(text: string): string[] {
  const list = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const last = list.at(-1);
  return list.length > 1 && last !== undefined && last.length === 1 ? list.slice(0, -1) : list;
}

const strictKey = (text: string) => tokens(text).join(" ");
const aliasTokens = (text: string) =>
  tokens(text)
    .map((token) => SYNONYMS[token] ?? token)
    .filter((token) => !GENERIC.has(token));

/**
 * Description of the look a product name refers to. Three tiers, stopping at the first that finds
 * anything: equal after normalization; equal after color translation and generic-word removal;
 * every look word (two or more) is in the product name. A tier must find exactly one look, else
 * nothing is guessed.
 */
export function findLookDescription(looks: readonly Look[], productName: string): string | null {
  const strict = strictKey(productName);
  const alias = aliasTokens(productName);
  const aliasKey = alias.join(" ");

  const tiers: ((look: Look) => boolean)[] = [
    (look) => strict !== "" && strictKey(look.name) === strict,
    (look) => aliasKey !== "" && aliasTokens(look.name).join(" ") === aliasKey,
    (look) => {
      const words = aliasTokens(look.name);
      return words.length >= 2 && words.every((word) => alias.includes(word));
    },
  ];
  for (const test of tiers) {
    const found = looks.filter(test);
    if (found.length > 0) return found.length === 1 ? (found[0]?.description ?? null) : null;
  }
  return null;
}
