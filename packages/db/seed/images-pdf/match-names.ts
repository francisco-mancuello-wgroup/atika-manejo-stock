import { aliasTokens, normalizeName } from "./normalize";

export type MatchRule = "exact" | "alias" | "token-subset";

export type NameOutcome =
  | { status: "matched"; productIndex: number; rule: MatchRule }
  | { status: "ambiguous"; candidates: number[] }
  | { status: "none" };

interface Candidate {
  productIndex: number;
  name: string;
}

interface Resolution {
  rule: MatchRule;
  candidates: number[];
}

/**
 * Matches captions to product names in three tiers, stopping at the first tier that finds anything:
 * 1. equal after normalization, 2. equal after colour translation and generic-word removal,
 * 3. every caption word (two or more) appears in the product name. A tier must find exactly one
 * product; several products, or a product claimed by two captions, is reported as ambiguous.
 */
export function matchNames(
  captions: readonly string[],
  products: readonly Candidate[],
  ignore: readonly string[] = [],
): NameOutcome[] {
  const strict = products.map((p) => normalizeName(p.name, ignore));
  const alias = products.map((p) => aliasTokens(p.name, ignore));

  const pick = (test: (index: number) => boolean): number[] =>
    products.flatMap((p, index) => (test(index) ? [p.productIndex] : []));

  const resolve = (caption: string): Resolution | null => {
    const key = normalizeName(caption, ignore);
    const exact = key ? pick((i) => strict[i] === key) : [];
    if (exact.length > 0) return { rule: "exact", candidates: exact };

    const words = aliasTokens(caption, ignore);
    const aliased = words.length > 0 ? pick((i) => alias[i]?.join(" ") === words.join(" ")) : [];
    if (aliased.length > 0) return { rule: "alias", candidates: aliased };

    const subset = words.length >= 2 ? pick((i) => words.every((w) => alias[i]?.includes(w))) : [];
    return subset.length > 0 ? { rule: "token-subset", candidates: subset } : null;
  };

  const resolved = captions.map(resolve);
  const claims = new Map<number, number>();
  for (const r of resolved) {
    const only = r?.candidates.length === 1 ? r.candidates[0] : undefined;
    if (only !== undefined) claims.set(only, (claims.get(only) ?? 0) + 1);
  }

  return resolved.map((r): NameOutcome => {
    if (!r) return { status: "none" };
    const only = r.candidates.length === 1 ? r.candidates[0] : undefined;
    if (only === undefined || (claims.get(only) ?? 0) > 1) {
      return { status: "ambiguous", candidates: r.candidates };
    }
    return { status: "matched", productIndex: only, rule: r.rule };
  });
}
