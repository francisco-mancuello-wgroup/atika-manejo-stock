import { CATALOG_CATEGORIES } from "../../src/categories";
import type { ParsedLot } from "../excel/parse";
import { inferCategory } from "./infer";
import { LOOKS_LOT, type Look, matchLooks } from "./looks";

/** What a re-seed must keep of a product the admin may have edited. */
export interface Preserved {
  isPublished: boolean;
  category: string | null;
}

export interface ProductChoice {
  isPublished: boolean;
  category: string | null;
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
 */
export function planChoices(
  lots: readonly ParsedLot[],
  looks: readonly Look[],
  preserved: ReadonlyMap<string, Preserved>,
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
        const isPublished = kept?.isPublished ?? false;
        if (kept?.category) {
          return { isPublished, category: kept.category, reason: "preserved from the database" };
        }
        const inferred = inferCategory({
          name: product.name,
          lookDescription: look?.description ?? null,
        });
        if (inferred.category) {
          const via = look ? ` (look ${look.number} "${look.name}")` : "";
          return { isPublished, category: inferred.category, reason: `${inferred.reason}${via}` };
        }
        const missingLook =
          lot.lotName === LOOKS_LOT && !look
            ? "; no look in the atika.pdf index names this product"
            : "";
        return { isPublished, category: null, reason: `${inferred.reason}${missingLook}` };
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
