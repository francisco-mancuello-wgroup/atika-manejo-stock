import { CATALOG_CATEGORIES } from "../../src/categories";
import type { ParsedLot } from "../excel/parse";
import { inferCategory } from "./infer";
import type { LookbookPlan } from "./lookbook";
import { LOOKS_LOT, type Look, matchLooks } from "./looks";

/** Lookbook placement and owner price, edited in the ERP and kept across re-seeds. */
export interface Lookbook {
  catalog: "casa_icona" | "milonga" | "sordo" | null;
  catalogOrder: number | null;
  catalogSection: string | null;
  catalogName: string | null;
  salePriceUsd: number | null;
}

export const NO_LOOKBOOK: Lookbook = {
  catalog: null,
  catalogOrder: null,
  catalogSection: null,
  catalogName: null,
  salePriceUsd: null,
};

/** What a re-seed must keep of a product the admin may have edited. */
export interface Preserved {
  isPublished: boolean;
  category: string | null;
  lookbook?: Lookbook;
}

export interface ProductChoice {
  isPublished: boolean;
  category: string | null;
  lookbook: Lookbook;
  /** Where the category came from, or why there is none. */
  reason: string;
}

export interface ChoicePlan {
  get(lotName: string, productIndex: number): ProductChoice;
}

/**
 * Identity of a product across re-seeds: lot, name, code and the position among products that
 * share all three (the same lot + position + name + code the image manifests rely on, without
 * depending on gaps in the position). `products` must be in import order.
 */
export function productKeys(
  lotName: string,
  products: readonly { name: string; code: string | null }[],
): string[] {
  const seen = new Map<string, number>();
  return products.map((p) => {
    const base = `${lotName}\u0000${p.name}\u0000${p.code ?? ""}`;
    const nth = seen.get(base) ?? 0;
    seen.set(base, nth + 1);
    return `${base}\u0000${nth}`;
  });
}

/**
 * Decides publication and category for every parsed product. Preserved values win: a stored
 * category is kept, a stored publication state is restored. A product with no stored category is
 * inferred; a product never seen before is hidden.
 *
 * Lookbook: a preserved placement (catalog set in the ERP) wins. A product without one takes its
 * placement from the committed lookbook data and is published, since the lookbook only shows
 * published pieces; a preserved owner price is still kept.
 */
export function planChoices(
  lots: readonly ParsedLot[],
  looks: readonly Look[],
  preserved: ReadonlyMap<string, Preserved>,
  placements?: LookbookPlan,
): ChoicePlan {
  const choices = new Map<string, ProductChoice[]>();
  for (const lot of lots) {
    const keys = productKeys(lot.lotName, lot.products);
    const lotLooks =
      lot.lotName === LOOKS_LOT ? matchLooks(looks, lot.products) : lot.products.map(() => null);
    choices.set(
      lot.lotName,
      lot.products.map((product, index): ProductChoice => {
        const kept = preserved.get(keys[index] ?? "");
        const look = lotLooks[index] ?? null;
        const keptLookbook = kept?.lookbook ?? NO_LOOKBOOK;
        const fromData = keptLookbook.catalog ? null : placements?.get(lot.lotName, index);
        const isPublished = fromData ? true : (kept?.isPublished ?? false);
        const lookbook: Lookbook = fromData
          ? {
              ...fromData.lookbook,
              salePriceUsd: keptLookbook.salePriceUsd ?? fromData.lookbook.salePriceUsd,
            }
          : keptLookbook;
        if (kept?.category) {
          return {
            isPublished,
            category: kept.category,
            lookbook,
            reason: "preserved from the database",
          };
        }
        const inferred = inferCategory({
          name: product.name,
          lookDescription: look?.description ?? null,
        });
        if (inferred.category) {
          const via = look ? ` (look ${look.number} "${look.name}")` : "";
          return {
            isPublished,
            category: inferred.category,
            lookbook,
            reason: `${inferred.reason}${via}`,
          };
        }
        const missingLook =
          lot.lotName === LOOKS_LOT && !look
            ? "; no look in the atika.pdf index names this product"
            : "";
        return {
          isPublished,
          category: null,
          lookbook,
          reason: `${inferred.reason}${missingLook}`,
        };
      }),
    );
  }
  return {
    get(lotName, productIndex) {
      const choice = choices.get(lotName)?.[productIndex];
      if (!choice) throw new Error(`${lotName}: no choice for product ${productIndex}`);
      return choice;
    },
  };
}

export interface CategoryReport {
  counts: Record<string, number>;
  uncategorized: { lot: string; name: string; code: string | null; reason: string }[];
}

export function buildReport(lots: readonly ParsedLot[], plan: ChoicePlan): CategoryReport {
  const counts: Record<string, number> = Object.fromEntries(
    CATALOG_CATEGORIES.map((c) => [c.slug, 0]),
  );
  const uncategorized: CategoryReport["uncategorized"] = [];
  for (const lot of lots) {
    for (const [index, product] of lot.products.entries()) {
      const choice = plan.get(lot.lotName, index);
      if (choice.category) {
        counts[choice.category] = (counts[choice.category] ?? 0) + 1;
      } else {
        uncategorized.push({
          lot: lot.lotName,
          name: product.name,
          code: product.code,
          reason: choice.reason,
        });
      }
    }
  }
  return { counts, uncategorized };
}

export function formatReport(report: CategoryReport): string {
  const lines = ["Categories:"];
  for (const [slug, count] of Object.entries(report.counts)) lines.push(`  ${slug}: ${count}`);
  lines.push(`  (none): ${report.uncategorized.length}`);
  if (report.uncategorized.length > 0) {
    lines.push("Products without category:");
    for (const u of report.uncategorized) {
      lines.push(`  ${u.lot} / ${u.name}${u.code ? ` [${u.code}]` : ""}: ${u.reason}`);
    }
  }
  return lines.join("\n");
}
