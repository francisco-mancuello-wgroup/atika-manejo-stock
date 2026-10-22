import type { Prisma } from "@atika/db";

/**
 * Virtual stock math. A group assigns part of a variant's physical stock to the web; nothing is
 * moved, so `variant.stock` stays the physical total and these numbers are always derived.
 */

export interface GroupWindow {
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}

/** A group counts as active while its switch is on and `now` is inside its window (ends inclusive). */
export function isGroupActive(group: GroupWindow, now: Date): boolean {
  if (!group.isActive) return false;
  if (group.startsAt && group.startsAt > now) return false;
  if (group.endsAt && group.endsAt < now) return false;
  return true;
}

/** The same definition as {@link isGroupActive}, as a database filter on `PublicationGroup`. */
export function activeGroupWhere(now: Date): Prisma.PublicationGroupWhereInput {
  return {
    isActive: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  };
}

/** Units of an allocation still sellable on the web: what is left of it, capped by the physical stock. */
export function remaining(allocated: number, sold: number, stock: number): number {
  return Math.min(Math.max(0, allocated - sold), Math.max(0, stock));
}

/** Inventory not held by any active group (what the store can still assign or sell freely). */
export function freeInventory(
  stock: number,
  activeAllocations: readonly { allocated: number; sold: number }[],
): number {
  const held = activeAllocations.reduce(
    (total, { allocated, sold }) => total + remaining(allocated, sold, stock),
    0,
  );
  return Math.max(0, stock - held);
}

interface AllocationLimits {
  /** Units of this variant already sold through the group. */
  sold: number;
  stock: number;
  /** Remainders held by the other active groups for the same variant. */
  otherActiveRemainder: number;
}

/**
 * Highest `allocated` the group can take: what it already sold plus the stock the other active
 * groups don't hold. It equals "free inventory + current remainder" for an active group, and the
 * value checked at activation time for an inactive one.
 */
export function maxAllocation({ sold, stock, otherActiveRemainder }: AllocationLimits): number {
  return sold + Math.max(0, stock - otherActiveRemainder);
}

export type AllocationCheck =
  | { ok: true }
  | { ok: false; reason: "below_sold" | "exceeds_free"; limit: number };

/** `limit` is the bound that was crossed: the sold count (minimum) or the maximum assignable. */
export function validateAllocation({
  allocated,
  ...limits
}: AllocationLimits & { allocated: number }): AllocationCheck {
  if (allocated < limits.sold) return { ok: false, reason: "below_sold", limit: limits.sold };
  const max = maxAllocation(limits);
  if (allocated > max) return { ok: false, reason: "exceeds_free", limit: max };
  return { ok: true };
}

/** What a bulk add proposes per size: all the free stock, one unit, or nothing (adjusted later). */
export type Proposal = "all" | "one" | "zero";

export function proposedAllocation(free: number, proposal: Proposal): number {
  if (proposal === "zero") return 0;
  return proposal === "one" ? Math.min(1, free) : free;
}
