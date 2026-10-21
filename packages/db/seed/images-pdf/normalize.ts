/** Colour words the PDFs write in English and the workbooks in Spanish. */
const SYNONYMS: Record<string, string> = { black: "negro", white: "blanco" };

/** Words the catalogs add to a name that the workbooks leave out. */
const GENERIC = new Set(["dress", "mini", "tamano"]);

function tokens(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** A lone trailing letter ("Cardigan A") is Milonga's style suffix, not part of the name. */
function withoutTrailingLetter(list: string[]): string[] {
  const last = list[list.length - 1];
  return list.length > 1 && last !== undefined && last.length === 1 ? list.slice(0, -1) : list;
}

/**
 * Strict comparison key: case, accents, punctuation (including the middle dot), a trailing single
 * letter and the ignored brand tokens are not significant.
 */
export function normalizeName(text: string, ignore: readonly string[] = []): string {
  return withoutTrailingLetter(tokens(text).filter((t) => !ignore.includes(t))).join(" ");
}

/** Looser key tokens: strict key plus colour translation and generic garment words dropped. */
export function aliasTokens(text: string, ignore: readonly string[] = []): string[] {
  return withoutTrailingLetter(tokens(text).filter((t) => !ignore.includes(t)))
    .map((t) => SYNONYMS[t] ?? t)
    .filter((t) => !GENERIC.has(t));
}

export function aliasName(text: string, ignore: readonly string[] = []): string {
  return aliasTokens(text, ignore).join(" ");
}
