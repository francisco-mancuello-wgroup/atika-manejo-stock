import type { Prisma } from "@atika/db";

/**
 * Stock the public web can sell, derived from the physical stock and the active publication
 * groups. This duplicates the small remainder math of the ERP (`catalog-groups/stock.ts`): the
 * apps can't import each other and the rule is three lines, so a shared package isn't worth it.
 */

/** An allocation of an ACTIVE group (the query already filters the groups by switch and window). */
export interface WebAllocation {
  allocated: number;
  sold: number;
}

export interface WebVariant {
  size: string;
  /** Physical stock. */
  stock: number;
  allocations: readonly WebAllocation[];
}

/** The same definition of "active group" as the ERP, as a filter on `PublicationGroup`. */
export function activeGroupWhere(now: Date): Prisma.PublicationGroupWhereInput {
  return {
    isActive: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  };
}

/** What the allocations of active groups keep for the web, capped by the physical stock. */
function groupRemainder(variant: WebVariant): number {
  const left = variant.allocations.reduce(
    (total, { allocated, sold }) => total + Math.max(0, allocated - sold),
    0,
  );
  return Math.min(left, Math.max(0, variant.stock));
}

/**
 * Which rule decides what the public web shows. While at least one group is active the groups
 * override everything ("groups"); otherwise the manual publication of each product applies
 * ("manual"), with its full physical stock.
 */
export type WebMode = "manual" | "groups";

export function webModeFor(activeGroups: number): WebMode {
  return activeGroups > 0 ? "groups" : "manual";
}

/**
 * Units of a size the web can sell. Manual mode shows the whole physical stock. Groups mode shows
 * the group remainder, and any size outside every active group reads as sold out.
 */
export function webStock(variant: WebVariant, mode: WebMode): number {
  if (mode === "manual") return Math.max(0, variant.stock);
  return groupRemainder(variant);
}

/** The rows the web can show in a mode (published, or allocated in an active group). */
export function webVisibilityWhere(mode: WebMode, now: Date): Prisma.ProductWhereInput {
  if (mode === "manual") return { isPublished: true };
  return { variants: { some: { allocations: { some: { group: activeGroupWhere(now) } } } } };
}

/** The variants as the view models read them: `stock` is the web stock. */
export function toWebVariants(
  variants: readonly WebVariant[],
  mode: WebMode,
): { size: string; stock: number }[] {
  return variants.map((variant) => ({ size: variant.size, stock: webStock(variant, mode) }));
}
