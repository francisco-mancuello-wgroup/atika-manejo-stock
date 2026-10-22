import { matchesSearch } from "../bank-promos/workspace";
import type { GroupProduct } from "../queries/catalog-groups";
import { sortSizes } from "../sizes";
import { remaining } from "./stock";

/** Quantities as typed in the matrix, by variant id. Text, so a half-typed number is kept as is. */
export type Draft = Record<string, string>;

export type RowFilter = "todas" | "libre" | "agotadas";

/** Whole number of 0 or more; blank or anything else counts as 0. */
export function toCount(text: string | undefined): number {
  const value = Number(text);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

const allSizes = (products: readonly GroupProduct[]) => products.flatMap((p) => p.sizes);

/** Every size starts at the quantity the group has saved for it. */
export function savedDraft(products: readonly GroupProduct[]): Draft {
  return Object.fromEntries(allSizes(products).map((s) => [s.variantId, String(s.allocated)]));
}

/** Sizes present in the group, canonical order. */
export function matrixSizes(products: readonly GroupProduct[]): string[] {
  return sortSizes([...new Set(allSizes(products).map((s) => s.size))]);
}

/** What the web would show of the product with these quantities. */
export function rowRemaining(product: GroupProduct, draft: Draft): number {
  return product.sizes.reduce(
    (total, s) => total + remaining(toCount(draft[s.variantId]), s.sold, s.stock),
    0,
  );
}

export interface GroupKpis {
  products: number;
  sizes: number;
  allocated: number;
  sold: number;
  /** What the web sees. */
  remaining: number;
}

/** Totals of the group from the saved quantities. */
export function groupKpis(products: readonly GroupProduct[], saved: Draft): GroupKpis {
  const sizes = allSizes(products);
  return {
    products: products.length,
    sizes: sizes.length,
    allocated: sizes.reduce((total, s) => total + toCount(saved[s.variantId]), 0),
    sold: sizes.reduce((total, s) => total + s.sold, 0),
    remaining: products.reduce((total, p) => total + rowRemaining(p, saved), 0),
  };
}

export interface DraftChange {
  variantId: string;
  /** "COSTA BLANCO S". */
  label: string;
  from: number;
  to: number;
}

/** Sizes whose typed quantity differs from the saved one, in matrix order. */
export function draftChanges(
  products: readonly GroupProduct[],
  saved: Draft,
  draft: Draft,
): DraftChange[] {
  return products.flatMap((product) =>
    product.sizes.flatMap((s) => {
      const from = toCount(saved[s.variantId]);
      const to = toCount(draft[s.variantId]);
      return from === to
        ? []
        : [{ variantId: s.variantId, label: `${product.name} ${s.size}`, from, to }];
    }),
  );
}

/** Every size at the most the group can take (never below what was sold). */
export function assignAllFree(products: readonly GroupProduct[]): Draft {
  return Object.fromEntries(allSizes(products).map((s) => [s.variantId, String(s.max)]));
}

export function filterRows(
  products: readonly GroupProduct[],
  draft: Draft,
  query: string,
  filter: RowFilter,
): GroupProduct[] {
  return products.filter((product) => {
    if (!matchesSearch(query, [product.name])) return false;
    if (filter === "libre") return product.sizes.some((s) => s.free > 0);
    if (filter === "agotadas") return rowRemaining(product, draft) === 0;
    return true;
  });
}

/**
 * New saved values arrived (a save, an add, a remove): a size keeps what was typed only while it
 * is still unsaved and its saved value did not move; everything else takes the saved value.
 */
export function reconcileDraft(prevSaved: Draft, prevDraft: Draft, nextSaved: Draft): Draft {
  return Object.fromEntries(
    Object.entries(nextSaved).map(([id, saved]) => {
      const typed = prevDraft[id];
      const unsaved = typed !== undefined && typed !== prevSaved[id] && prevSaved[id] === saved;
      return [id, unsaved ? typed : saved];
    }),
  );
}
