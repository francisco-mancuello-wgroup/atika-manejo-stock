import type { Catalog } from "@atika/db";
import { CATALOG_CATEGORIES } from "@atika/db/categories";
import type { GroupCandidate, GroupOptions } from "../queries/catalog-groups";
import type { ProductFilter } from "./groups";
import { type Proposal, proposedAllocation } from "./stock";

/** A product can be picked unless it is already in the group or has nothing free. */
export function isSelectable(candidate: GroupCandidate): boolean {
  return !candidate.inGroup && candidate.sizes.some((size) => size.free > 0);
}

export function selectableIds(candidates: readonly GroupCandidate[]): string[] {
  return candidates.filter(isSelectable).map((candidate) => candidate.id);
}

/** "S 3 · M 1 · L 1": the sizes with free stock. */
export function freeSizesLabel(candidate: GroupCandidate): string {
  return candidate.sizes
    .filter((size) => size.free > 0)
    .map((size) => `${size.size} ${size.free}`)
    .join(" · ");
}

/** Units the bulk add would assign to the selected products with the chosen proposal. */
export function proposedUnits(
  candidates: readonly GroupCandidate[],
  selected: ReadonlySet<string>,
  proposal: Proposal,
): number {
  return candidates
    .filter((candidate) => selected.has(candidate.id) && isSelectable(candidate))
    .flatMap((candidate) => candidate.sizes)
    .reduce((total, size) => total + proposedAllocation(size.free, proposal), 0);
}

export type Criterion = "lote" | "catalogo" | "categoria" | "marca";

export const CRITERIA: readonly [Criterion, string][] = [
  ["lote", "Lote"],
  ["catalogo", "Catálogo"],
  ["categoria", "Categoría"],
  ["marca", "Marca"],
];

const LOOKBOOKS: readonly [Catalog, string][] = [
  ["casa_icona", "Casa Icona"],
  ["milonga", "Milonga"],
  ["sordo", "Sordo"],
];

/** The bulk-add filter for a criterion and one of its values. */
export function criterionFilter(criterion: Criterion, value: string): ProductFilter {
  switch (criterion) {
    case "lote":
      return { lotId: value };
    case "catalogo":
      return { catalog: value as Catalog };
    case "categoria":
      return { category: value };
    case "marca":
      return { brand: value };
  }
}

/** `[value, label]` pairs the criterion can pick from. */
export function criterionOptions(criterion: Criterion, options: GroupOptions): [string, string][] {
  switch (criterion) {
    case "lote":
      return options.lots.map((lot) => [lot.id, lot.name]);
    case "catalogo":
      return LOOKBOOKS.map(([value, label]) => [value, label]);
    case "categoria":
      return CATALOG_CATEGORIES.map((category) => [category.slug, category.label]);
    case "marca":
      return options.brands.map((brand) => [brand, brand]);
  }
}
