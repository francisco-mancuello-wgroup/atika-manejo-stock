import { type Focus, focusOf } from "./focus";
import { type LookbookPage, pageAnchor } from "./lookbook";

/** One lookbook page as the search box sees it. */
export interface SearchEntry {
  anchor: string;
  title: string;
  catalog: string;
  section: string | null;
  colors: string[];
  photo: string | null;
  photoFocus: Focus;
  /** Everything a shopper may type, already normalized. */
  text: string;
}

/** Lowercase without accents, so "falda" finds "Fálda" and "FALDA". */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function searchEntriesOf(
  catalog: { slug: string; name: string },
  pages: readonly LookbookPage[],
): SearchEntry[] {
  return pages.map((page) => {
    const colors = [
      ...new Set(page.pieces.flatMap((piece) => (piece.color ? [piece.color.label] : []))),
    ];
    const words = [
      page.title,
      catalog.name,
      page.brand,
      page.section,
      ...colors,
      ...page.pieces.map((piece) => piece.description),
    ];
    return {
      anchor: pageAnchor(catalog.slug, page.page),
      title: page.title,
      catalog: catalog.name,
      section: page.section,
      colors,
      photo: page.photos[0]?.url ?? null,
      photoFocus: focusOf(page.photos[0] ?? {}),
      text: normalize(words.filter(Boolean).join(" ")),
    };
  });
}

/** Pages whose text holds every word of the query, in catalog order. */
export function searchEntries(entries: readonly SearchEntry[], query: string): SearchEntry[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return entries.filter((entry) => {
    const text = normalize(entry.text);
    return words.every((word) => text.includes(word));
  });
}
