import { describe, expect, it } from "vitest";
import {
  activeGroupWhere,
  freeInventory,
  isGroupActive,
  maxAllocation,
  remaining,
  validateAllocation,
} from "./stock";

const NOW = new Date("2026-10-22T15:00:00.000Z");
const before = new Date("2026-10-22T14:00:00.000Z");
const after = new Date("2026-10-22T16:00:00.000Z");

describe("remaining", () => {
  it("is what was assigned minus what was sold", () => {
    expect(remaining(10, 3, 50)).toBe(7);
  });

  it("is capped by the physical stock", () => {
    expect(remaining(10, 0, 4)).toBe(4);
  });

  it("never goes below zero", () => {
    expect(remaining(5, 8, 50)).toBe(0);
    expect(remaining(5, 0, -2)).toBe(0);
  });
});

describe("freeInventory", () => {
  it("is the stock without the remainders of the active groups", () => {
    expect(freeInventory(20, [{ allocated: 8, sold: 3 }])).toBe(15);
  });

  it("is the whole stock without active groups", () => {
    expect(freeInventory(20, [])).toBe(20);
  });

  it("never goes below zero", () => {
    expect(freeInventory(5, [{ allocated: 9, sold: 0 }])).toBe(0);
  });
});

describe("isGroupActive", () => {
  const open = { isActive: true, startsAt: null, endsAt: null };

  it("needs the switch on", () => {
    expect(isGroupActive(open, NOW)).toBe(true);
    expect(isGroupActive({ ...open, isActive: false }, NOW)).toBe(false);
  });

  it("respects the window, both ends inclusive", () => {
    expect(isGroupActive({ ...open, startsAt: after }, NOW)).toBe(false);
    expect(isGroupActive({ ...open, endsAt: before }, NOW)).toBe(false);
    expect(isGroupActive({ ...open, startsAt: NOW, endsAt: NOW }, NOW)).toBe(true);
    expect(isGroupActive({ ...open, startsAt: before, endsAt: after }, NOW)).toBe(true);
  });
});

describe("activeGroupWhere", () => {
  it("mirrors isGroupActive as a database filter", () => {
    expect(activeGroupWhere(NOW)).toEqual({
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: NOW } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: NOW } }] },
      ],
    });
  });
});

describe("maxAllocation", () => {
  it("is what was sold plus the stock not held by other active groups", () => {
    expect(maxAllocation({ sold: 2, stock: 10, otherActiveRemainder: 4 })).toBe(8);
  });

  it("keeps what was already sold when the stock is exhausted", () => {
    expect(maxAllocation({ sold: 3, stock: 2, otherActiveRemainder: 5 })).toBe(3);
  });
});

describe("validateAllocation", () => {
  const base = { sold: 2, stock: 10, otherActiveRemainder: 0 };

  it("accepts a quantity between what was sold and the limit", () => {
    expect(validateAllocation({ ...base, allocated: 2 })).toEqual({ ok: true });
    expect(validateAllocation({ ...base, allocated: 12 })).toEqual({ ok: true });
  });

  it("refuses to go below what was already sold", () => {
    expect(validateAllocation({ ...base, allocated: 1 })).toEqual({
      ok: false,
      reason: "below_sold",
      limit: 2,
    });
  });

  it("refuses more than the free inventory allows", () => {
    expect(validateAllocation({ ...base, allocated: 13, otherActiveRemainder: 0 })).toEqual({
      ok: false,
      reason: "exceeds_free",
      limit: 12,
    });
    expect(validateAllocation({ ...base, allocated: 9, otherActiveRemainder: 4 })).toEqual({
      ok: false,
      reason: "exceeds_free",
      limit: 8,
    });
  });
});
