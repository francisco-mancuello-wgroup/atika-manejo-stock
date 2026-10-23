import { describe, expect, it } from "vitest";
import {
  type BankPromoRule,
  groupPromosForDisplay,
  isPromoLive,
  mergePromoGroups,
  promoHeadline,
  promosForProduct,
  sortPromosForDisplay,
} from "./index";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const itau = { id: "b-itau", name: "Itaú", logoUrl: "/logos/itau.png" };
const continental = { id: "b-conti", name: "Continental", logoUrl: null };

function promo(overrides: Partial<BankPromoRule> = {}): BankPromoRule {
  return {
    kind: "installments",
    value: 12,
    days: [],
    capGs: null,
    startsAt: null,
    endsAt: null,
    terms: null,
    isActive: true,
    scope: "all",
    lotIds: [],
    productIds: [],
    banks: [itau],
    ...overrides,
  };
}

// Wednesday 2026-10-21 12:00 in Asunción (UTC-3).
const wednesday = new Date("2026-10-21T15:00:00.000Z");

describe("isPromoLive", () => {
  it("is live when active, open-ended and valid every day", () => {
    expect(isPromoLive(promo(), wednesday)).toBe(true);
  });

  it("is not live when inactive", () => {
    expect(isPromoLive(promo({ isActive: false }), wednesday)).toBe(false);
  });

  it("includes the first and last day of the window (Asunción calendar days)", () => {
    const window = promo({ startsAt: day("2026-10-21"), endsAt: day("2026-10-21") });
    expect(isPromoLive(window, wednesday)).toBe(true);
    expect(isPromoLive(window, new Date("2026-10-20T15:00:00.000Z"))).toBe(false);
    expect(isPromoLive(window, new Date("2026-10-22T15:00:00.000Z"))).toBe(false);
  });

  it("judges the day in Asunción, not UTC", () => {
    // 2026-10-22 01:00 UTC is still the 21st in Asunción (UTC-3).
    const lastDay = promo({ endsAt: day("2026-10-21") });
    expect(isPromoLive(lastDay, new Date("2026-10-22T01:00:00.000Z"))).toBe(true);
    expect(isPromoLive(lastDay, new Date("2026-10-22T03:00:00.000Z"))).toBe(false);
  });

  it("only applies on the allowed weekdays (1 = Monday ... 7 = Sunday)", () => {
    expect(isPromoLive(promo({ days: [3] }), wednesday)).toBe(true);
    expect(isPromoLive(promo({ days: [1, 4] }), wednesday)).toBe(false);
  });

  it("reads the weekday on the Asunción day, not UTC", () => {
    // Wednesday 22:00 in Asunción is already Thursday in UTC.
    const lateWednesday = new Date("2026-10-22T01:00:00.000Z");
    expect(isPromoLive(promo({ days: [3] }), lateWednesday)).toBe(true);
    expect(isPromoLive(promo({ days: [4] }), lateWednesday)).toBe(false);
  });

  it("maps Sunday to 7", () => {
    const sunday = new Date("2026-10-25T15:00:00.000Z");
    expect(isPromoLive(promo({ days: [7] }), sunday)).toBe(true);
    expect(isPromoLive(promo({ days: [1] }), sunday)).toBe(false);
  });
});

describe("promosForProduct", () => {
  const target = { productId: "p1", lotId: "l1" };

  it("returns promos with scope 'all' for any product", () => {
    const all = promo();
    expect(promosForProduct([all], target, wednesday)).toEqual([all]);
  });

  it("covers 'lots' promos by the product's lot", () => {
    const lots = promo({ scope: "lots", lotIds: ["l1"] });
    expect(promosForProduct([lots], target, wednesday)).toEqual([lots]);
    expect(promosForProduct([lots], { productId: "p1", lotId: "l2" }, wednesday)).toEqual([]);
  });

  it("covers 'products' promos by product id", () => {
    const products = promo({ scope: "products", productIds: ["p1"] });
    expect(promosForProduct([products], target, wednesday)).toEqual([products]);
    expect(promosForProduct([products], { productId: "p2", lotId: "l1" }, wednesday)).toEqual([]);
  });

  it("ignores the lists that do not belong to the scope", () => {
    const all = promo({ scope: "all", lotIds: ["x"], productIds: ["y"] });
    const lots = promo({ scope: "lots", productIds: ["p1"] });
    const products = promo({ scope: "products", lotIds: ["l1"] });
    expect(promosForProduct([all], target, wednesday)).toEqual([all]);
    expect(promosForProduct([lots, products], target, wednesday)).toEqual([]);
  });

  it("drops promos that are not live", () => {
    const list = [promo({ isActive: false }), promo({ days: [1] }), promo({ value: 6 })];
    expect(promosForProduct(list, target, wednesday).map((p) => p.value)).toEqual([6]);
  });
});

describe("promoHeadline", () => {
  it("words installments", () => {
    expect(promoHeadline(promo())).toBe("Hasta 12 cuotas sin intereses");
  });

  it("words refunds and discounts as a percent", () => {
    expect(promoHeadline(promo({ kind: "refund", value: 20 }))).toBe("20 % de reintegro");
    expect(promoHeadline(promo({ kind: "discount", value: 15 }))).toBe("15 % de descuento");
  });

  it("appends the allowed days, only the first capitalized", () => {
    expect(promoHeadline(promo({ days: [4] }))).toBe("Hasta 12 cuotas sin intereses · Jueves");
    expect(promoHeadline(promo({ days: [4, 1] }))).toBe(
      "Hasta 12 cuotas sin intereses · Lunes y jueves",
    );
    expect(promoHeadline(promo({ days: [5, 1, 3] }))).toBe(
      "Hasta 12 cuotas sin intereses · Lunes, miércoles y viernes",
    );
  });

  it("omits the days when the promo runs every day", () => {
    expect(promoHeadline(promo({ days: [1, 2, 3, 4, 5, 6, 7] }))).toBe(
      "Hasta 12 cuotas sin intereses",
    );
  });

  it("appends the cap with thousands separators", () => {
    expect(promoHeadline(promo({ kind: "refund", value: 20, capGs: 200_000 }))).toBe(
      "20 % de reintegro · Tope ₲ 200.000",
    );
    expect(promoHeadline(promo({ kind: "refund", value: 20, days: [4], capGs: 1_500_000 }))).toBe(
      "20 % de reintegro · Jueves · Tope ₲ 1.500.000",
    );
  });
});

describe("groupPromosForDisplay", () => {
  it("merges the banks of promos with the same headline, without duplicates", () => {
    const groups = groupPromosForDisplay([
      promo({ banks: [itau] }),
      promo({ banks: [continental, itau] }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.headline).toBe("Hasta 12 cuotas sin intereses");
    expect(groups[0]?.banks.map((b) => b.name)).toEqual(["Continental", "Itaú"]);
  });

  it("orders installments (highest first), then refunds, then discounts", () => {
    const groups = groupPromosForDisplay([
      promo({ kind: "discount", value: 15 }),
      promo({ kind: "installments", value: 6 }),
      promo({ kind: "refund", value: 20 }),
      promo({ kind: "installments", value: 12 }),
    ]);
    expect(groups.map((g) => g.headline)).toEqual([
      "Hasta 12 cuotas sin intereses",
      "Hasta 6 cuotas sin intereses",
      "20 % de reintegro",
      "15 % de descuento",
    ]);
  });

  it("keeps promos with different days or caps in separate groups", () => {
    const groups = groupPromosForDisplay([
      promo({ kind: "refund", value: 20, days: [4] }),
      promo({ kind: "refund", value: 20 }),
    ]);
    expect(groups.map((g) => g.headline)).toEqual([
      "20 % de reintegro",
      "20 % de reintegro · Jueves",
    ]);
  });

  it("is empty without promos", () => {
    expect(groupPromosForDisplay([])).toEqual([]);
  });
});

describe("promo names in groups", () => {
  it("carries the promo name on its group and omits it when the promo has none", () => {
    const [named] = groupPromosForDisplay([promo({ name: "Itaú viernes", banks: [itau] })]);
    expect(named?.name).toBe("Itaú viernes");
    const [plain] = groupPromosForDisplay([promo({ name: null })]);
    expect(plain).not.toHaveProperty("name");
  });

  it("keeps promos with the same benefit apart when their names differ", () => {
    const groups = groupPromosForDisplay([
      promo({ name: "Itaú viernes", banks: [itau] }),
      promo({ name: "Continental viernes", banks: [continental] }),
      promo({ banks: [itau] }),
    ]);
    expect(groups.map((group) => group.name ?? null).sort()).toEqual([
      "Continental viernes",
      "Itaú viernes",
      null,
    ]);
  });

  it("still merges the same named promo seen on several products", () => {
    const a = groupPromosForDisplay([promo({ name: "Itaú viernes", banks: [itau] })]);
    const b = groupPromosForDisplay([promo({ name: "Itaú viernes", banks: [itau] })]);
    const merged = mergePromoGroups([...a, ...b]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.name).toBe("Itaú viernes");
  });
});

describe("groupPromosForDisplay value", () => {
  it("carries the value of the benefit of each group", () => {
    const groups = groupPromosForDisplay([
      promo({ value: 6 }),
      promo({ kind: "refund", value: 20 }),
    ]);
    expect(groups.map((g) => [g.kind, g.value])).toEqual([
      ["installments", 6],
      ["refund", 20],
    ]);
  });
});

describe("sortPromosForDisplay", () => {
  it("orders installments (highest first), refunds, then discounts, keeping the promos intact", () => {
    const discount = promo({ kind: "discount", value: 15 });
    const six = promo({ value: 6 });
    const refund = promo({ kind: "refund", value: 20 });
    const twelve = promo({ value: 12 });
    expect(sortPromosForDisplay([discount, six, refund, twelve])).toEqual([
      twelve,
      six,
      refund,
      discount,
    ]);
  });

  it("puts the promo valid every day before the one limited to some days", () => {
    const thursday = promo({ kind: "refund", value: 20, days: [4] });
    const everyDay = promo({ kind: "refund", value: 20 });
    expect(sortPromosForDisplay([thursday, everyDay])).toEqual([everyDay, thursday]);
  });

  it("does not modify its input", () => {
    const list = [promo({ value: 6 }), promo({ value: 12 })];
    sortPromosForDisplay(list);
    expect(list.map((p) => p.value)).toEqual([6, 12]);
  });
});

describe("mergePromoGroups", () => {
  it("merges groups with the same headline and their banks, ordered like the display groups", () => {
    const a = groupPromosForDisplay([promo({ banks: [itau] })]);
    const b = groupPromosForDisplay([
      promo({ banks: [continental, itau] }),
      promo({ kind: "refund", value: 20, banks: [continental] }),
    ]);
    const merged = mergePromoGroups([...b, ...a]);
    expect(merged.map((g) => g.headline)).toEqual([
      "Hasta 12 cuotas sin intereses",
      "20 % de reintegro",
    ]);
    expect(merged[0]?.banks.map((bank) => bank.name)).toEqual(["Continental", "Itaú"]);
  });

  it("does not modify the groups it receives", () => {
    const [group] = groupPromosForDisplay([promo({ banks: [itau] })]);
    const [other] = groupPromosForDisplay([promo({ banks: [continental] })]);
    mergePromoGroups([group as never, other as never]);
    expect(group?.banks.map((bank) => bank.name)).toEqual(["Itaú"]);
  });

  it("is empty without groups", () => {
    expect(mergePromoGroups([])).toEqual([]);
  });
});
