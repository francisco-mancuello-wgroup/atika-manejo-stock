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
 * Units of a size the web can sell. A grouped size shows its group remainder. Any other size
 * shows the free inventory (stock minus what active groups hold, which for an ungrouped size is
 * its whole stock), but only when the product is published: an unpublished product is on the web
 * through its groups alone, so its other sizes read as sold out.
 */
export function webStock(variant: WebVariant, isPublished: boolean): number {
  if (variant.allocations.length > 0) return groupRemainder(variant);
  return isPublished ? Math.max(0, variant.stock) : 0;
}

/** Some size still has units held by an active group: that alone makes a product visible. */
export function hasActiveGroupStock(variants: readonly WebVariant[]): boolean {
  return variants.some((variant) => groupRemainder(variant) > 0);
}

/** The variants as the view models read them: `stock` is the web stock. */
export function toWebVariants(
  variants: readonly WebVariant[],
  isPublished: boolean,
): { size: string; stock: number }[] {
  return variants.map((variant) => ({
    size: variant.size,
    stock: webStock(variant, isPublished),
  }));
}
