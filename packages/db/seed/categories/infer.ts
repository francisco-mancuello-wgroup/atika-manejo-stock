import { CATALOG_CATEGORIES, type CatalogCategorySlug } from "../../src/categories";

export interface InferInput {
  name: string;
  /** The product's own description, when it has one. */
  description?: string | null;
  /** The brand catalog's one-line description of the look (Casa Icona). */
  lookDescription?: string | null;
}

export interface InferResult {
  category: CatalogCategorySlug | null;
  /** Why this category, or why none: shown in the seed report. */
  reason: string;
}

/** A kind of garment. Kinds that are not a catalog category are recognised only to say so. */
type Kind = CatalogCategorySlug | "pantalones" | "abrigos" | "trajes de baño";

/**
 * Whole-word keywords (lower case, no accents). A strong word names the garment; a weak word
 * (a length) only counts when no strong word is present. Abbreviations such as "T BSC M", "S PANTA",
 * "Bot", "SALIDA" or "ENTERO" are deliberately absent: they are never guessed.
 */
export const KEYWORDS: Record<Kind, { strong: readonly string[]; weak?: readonly string[] }> = {
  vestidos: {
    strong: ["vestido", "vestidos", "dress", "dresses", "minidress"],
    weak: ["maxi", "midi"],
  },
  tops: {
    strong: ["top", "tops", "blusa", "blusas", "camisa", "camisas", "shirt", "crop", "remera"],
  },
  "faldas-y-shorts": {
    strong: ["falda", "faldas", "pollera", "skirt", "short", "shorts"],
  },
  accesorios: {
    strong: [
      "aros",
      "aro",
      "earcuff",
      "earcuffs",
      "collar",
      "pulsera",
      "anillo",
      "cartera",
      "bolso",
      "bag",
      "cinturon",
    ],
  },
  pantalones: { strong: ["pantalon", "pantalones", "pants", "pant", "jean", "jeans", "leggings"] },
  abrigos: {
    strong: ["cardigan", "poncho", "abrigo", "campera", "chaqueta", "saco", "blazer", "tapado"],
  },
  "trajes de baño": { strong: ["bikini", "malla", "banador"] },
};

const CATALOG_SLUGS: readonly string[] = CATALOG_CATEGORIES.map((c) => c.slug);

function words(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

type Hit = { kind: Kind; word: string };

function hits(tokens: readonly string[], tier: "strong" | "weak"): Hit[] {
  const found: Hit[] = [];
  for (const [kind, table] of Object.entries(KEYWORDS) as [Kind, (typeof KEYWORDS)[Kind]][]) {
    const word = tokens.find((t) => (table[tier] ?? []).includes(t));
    if (word) found.push({ kind, word });
  }
  return found;
}

function resolve(found: Hit[], source: string): InferResult | null {
  const first = found[0];
  if (!first) return null;
  if (found.length > 1) {
    const list = found.map((h) => `${h.kind} ("${h.word}")`).join(", ");
    return { category: null, reason: `conflict in ${source}: ${list}` };
  }
  if (!CATALOG_SLUGS.includes(first.kind)) {
    return { category: null, reason: `${first.kind} ("${first.word}") has no catalog category` };
  }
  return {
    category: first.kind as CatalogCategorySlug,
    reason: `"${first.word}" in ${source}`,
  };
}

/**
 * Infers a catalog category from a product's name, then its description, then the brand's look
 * description. Keywords are matched as whole words, ignoring case and accents, in Spanish and
 * English. Never guesses: no keyword, a conflict (e.g. "blusa y short") or a garment without a
 * catalog category (pants, outerwear, swimwear) all yield `category: null` and a reason.
 */
export function inferCategory(input: InferInput): InferResult {
  const sources: [string, string][] = [
    ["the name", input.name],
    ["the description", input.description ?? ""],
    ["the look description", input.lookDescription ?? ""],
  ];
  const tokenized = sources.map(([label, text]) => [label, words(text)] as const);
  for (const tier of ["strong", "weak"] as const) {
    for (const [label, tokens] of tokenized) {
      const result = resolve(hits(tokens, tier), label);
      if (result) return result;
    }
  }
  return { category: null, reason: "no known garment word" };
}
