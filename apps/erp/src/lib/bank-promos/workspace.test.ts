import { describe, expect, it } from "vitest";
import type { BankPromoSummary } from "../queries/bank-promos";
import {
  matchesSearch,
  nextIdAfterDelete,
  type PromoDraft,
  parseSelection,
  promoPreview,
  promoRow,
  workspaceHref,
} from "./workspace";

const ids = { promoIds: ["p1", "p2"], bankIds: ["b1", "b2"] };

describe("parseSelection", () => {
  it("selects the first promo by default", () => {
    expect(parseSelection({}, ids)).toEqual({ tab: "promos", id: "p1", isNew: false });
  });

  it("selects the promo named in the URL, falling back to the first when it is unknown", () => {
    expect(parseSelection({ promo: "p2" }, ids)).toMatchObject({ tab: "promos", id: "p2" });
    expect(parseSelection({ promo: "zzz" }, ids)).toMatchObject({ id: "p1" });
  });

  it("opens an empty form for ?nueva=1", () => {
    expect(parseSelection({ nueva: "1" }, ids)).toEqual({ tab: "promos", id: null, isNew: true });
  });

  it("has no selection when there are no promos", () => {
    expect(parseSelection({}, { promoIds: [], bankIds: [] })).toEqual({
      tab: "promos",
      id: null,
      isNew: false,
    });
  });

  it("handles the banks tab the same way", () => {
    expect(parseSelection({ tab: "bancos" }, ids)).toEqual({
      tab: "bancos",
      id: "b1",
      isNew: false,
    });
    expect(parseSelection({ tab: "bancos", banco: "b2" }, ids)).toMatchObject({ id: "b2" });
    expect(parseSelection({ tab: "bancos", nuevo: "1" }, ids)).toEqual({
      tab: "bancos",
      id: null,
      isNew: true,
    });
  });

  it("ignores promo parameters on the banks tab and repeated parameters", () => {
    expect(parseSelection({ tab: "bancos", promo: "p2" }, ids)).toMatchObject({ id: "b1" });
    expect(parseSelection({ promo: ["p2", "p1"] }, ids)).toMatchObject({ id: "p2" });
  });
});

describe("workspaceHref", () => {
  it("builds the URL of every selection", () => {
    expect(workspaceHref({ tab: "promos", id: "p1" })).toBe("/promos/bancos?promo=p1");
    expect(workspaceHref({ tab: "promos", isNew: true })).toBe("/promos/bancos?nueva=1");
    expect(workspaceHref({ tab: "promos" })).toBe("/promos/bancos");
    expect(workspaceHref({ tab: "bancos", id: "b1" })).toBe("/promos/bancos?tab=bancos&banco=b1");
    expect(workspaceHref({ tab: "bancos", isNew: true })).toBe("/promos/bancos?tab=bancos&nuevo=1");
    expect(workspaceHref({ tab: "bancos" })).toBe("/promos/bancos?tab=bancos");
  });
});

describe("nextIdAfterDelete", () => {
  it("picks the following item, else the previous one, else nothing", () => {
    expect(nextIdAfterDelete(["a", "b", "c"], "b")).toBe("c");
    expect(nextIdAfterDelete(["a", "b", "c"], "c")).toBe("b");
    expect(nextIdAfterDelete(["a"], "a")).toBeNull();
    expect(nextIdAfterDelete(["a"], "zzz")).toBe("a");
  });
});

describe("matchesSearch", () => {
  it("ignores case and accents and matches any of the texts", () => {
    expect(matchesSearch("itau", ["Itaú", "Hasta 12 cuotas"])).toBe(true);
    expect(matchesSearch("  CUOTAS ", ["Itaú", "Hasta 12 cuotas"])).toBe(true);
    expect(matchesSearch("reintegro", ["Itaú", "Hasta 12 cuotas"])).toBe(false);
    expect(matchesSearch("", ["Itaú"])).toBe(true);
  });
});

const promo = (overrides: Partial<BankPromoSummary> = {}): BankPromoSummary => ({
  id: "p1",
  kind: "refund",
  value: 20,
  days: [4],
  capGs: 200_000,
  isActive: true,
  scope: "all",
  startsAt: null,
  endsAt: null,
  lotCount: 0,
  productCount: 0,
  banks: [
    { id: "b2", name: "Sudameris", logoUrl: null },
    { id: "b1", name: "BNF", logoUrl: null },
  ],
  ...overrides,
});

describe("promoRow", () => {
  it("splits the benefit from banks, days and cap", () => {
    expect(promoRow(promo(), "2026-10-22")).toEqual({
      benefit: "20 % de reintegro",
      detail: "Sudameris, BNF · Jueves · tope ₲ 200.000",
      status: "Vigente",
      searchText: "20 % de reintegro · Jueves · Tope ₲ 200.000 Sudameris BNF",
    });
  });

  it("shows only the banks when the promo has no days and no cap", () => {
    const row = promoRow(promo({ days: [], capGs: null, isActive: false }), "2026-10-22");
    expect(row.detail).toBe("Sudameris, BNF");
    expect(row.status).toBe("Inactiva");
  });
});

const draft = (overrides: Partial<PromoDraft> = {}): PromoDraft => ({
  kind: "installments",
  value: "12",
  capGs: "",
  startsAt: "",
  endsAt: "",
  scope: "all",
  bankIds: ["b1"],
  days: [],
  lotIds: [],
  productCount: 0,
  ...overrides,
});

const banks = [
  { id: "b1", name: "Itaú", logoUrl: null },
  { id: "b2", name: "Continental", logoUrl: null },
];
const lots = [
  { id: "l1", name: "Casa Icona", productCount: 3 },
  { id: "l2", name: "Verano", productCount: 2 },
];

describe("promoPreview", () => {
  it("groups the headline with the chosen banks and describes where it applies", () => {
    const preview = promoPreview(draft({ bankIds: ["b1", "b2"] }), banks, lots);
    expect(preview?.groups).toEqual([
      {
        headline: "Hasta 12 cuotas sin intereses",
        kind: "installments",
        value: 12,
        banks: [banks[1], banks[0]],
      },
    ]);
    expect(preview?.note).toBe("En todos los productos, todos los días.");
  });

  it("describes lot scope, weekdays and the window", () => {
    const preview = promoPreview(
      draft({
        kind: "refund",
        value: "20",
        capGs: "200.000",
        scope: "lots",
        lotIds: ["l1"],
        days: [4],
        startsAt: "2026-11-01",
        endsAt: "2026-11-30",
      }),
      banks,
      lots,
    );
    expect(preview?.groups[0]?.headline).toBe("20 % de reintegro · Jueves · Tope ₲ 200.000");
    expect(preview?.note).toBe(
      "Solo en prendas del lote Casa Icona, los jueves del 01/11 al 30/11.",
    );
  });

  it("describes several lots, products and open windows", () => {
    expect(
      promoPreview(draft({ scope: "lots", lotIds: ["l1", "l2"], days: [1, 4] }), banks, lots)?.note,
    ).toBe("Solo en prendas de los lotes Casa Icona y Verano, los lunes y jueves.");
    expect(promoPreview(draft({ scope: "products", productCount: 1 }), banks, lots)?.note).toBe(
      "Solo en 1 producto elegido, todos los días.",
    );
    expect(promoPreview(draft({ scope: "products", productCount: 5 }), banks, lots)?.note).toBe(
      "Solo en 5 productos elegidos, todos los días.",
    );
    expect(promoPreview(draft({ startsAt: "2026-11-01" }), banks, lots)?.note).toBe(
      "En todos los productos, todos los días desde el 01/11.",
    );
    expect(promoPreview(draft({ endsAt: "2026-11-30" }), banks, lots)?.note).toBe(
      "En todos los productos, todos los días hasta el 30/11.",
    );
  });

  it("describes a lot scope with nothing picked yet", () => {
    expect(promoPreview(draft({ scope: "lots" }), banks, lots)?.note).toBe(
      "Solo en prendas de los lotes elegidos, todos los días.",
    );
  });

  it("is null while the benefit or the banks are incomplete or invalid", () => {
    expect(promoPreview(draft({ value: "" }), banks, lots)).toBeNull();
    expect(promoPreview(draft({ value: "abc" }), banks, lots)).toBeNull();
    expect(promoPreview(draft({ value: "1" }), banks, lots)).toBeNull();
    expect(promoPreview(draft({ value: "49" }), banks, lots)).toBeNull();
    expect(promoPreview(draft({ kind: "discount", value: "101" }), banks, lots)).toBeNull();
    expect(promoPreview(draft({ kind: "discount", value: "0" }), banks, lots)).toBeNull();
    expect(promoPreview(draft({ bankIds: [] }), banks, lots)).toBeNull();
    expect(promoPreview(draft({ bankIds: ["gone"] }), banks, lots)).toBeNull();
    expect(promoPreview(draft({ capGs: "mucho" }), banks, lots)).toBeNull();
  });
});
