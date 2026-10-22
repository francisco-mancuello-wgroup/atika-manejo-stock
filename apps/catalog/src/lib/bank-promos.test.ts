import type { BankPromoRule } from "@atika/pricing";
import { describe, expect, it } from "vitest";
import { formatPromoWindow, toPublicPromo } from "./bank-promos";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const promo: BankPromoRule & { id: string } = {
  id: "p1",
  kind: "refund",
  value: 20,
  days: [4],
  capGs: 200_000,
  startsAt: day("2026-11-01"),
  endsAt: day("2026-11-30"),
  terms: "Solo tarjetas de crédito.",
  isActive: true,
  scope: "lots",
  lotIds: ["secret-lot"],
  productIds: ["secret-product"],
  banks: [{ id: "b1", name: "Itaú", logoUrl: "/media/banks/uploads/b1/a.webp" }],
};

describe("toPublicPromo", () => {
  it("keeps what the public page shows and nothing about lots or products", () => {
    expect(toPublicPromo(promo)).toEqual({
      id: "p1",
      headline: "20 % de reintegro · Jueves · Tope ₲ 200.000",
      kind: "refund",
      banks: [{ id: "b1", name: "Itaú", logoUrl: "/media/banks/uploads/b1/a.webp" }],
      startsAt: "2026-11-01",
      endsAt: "2026-11-30",
      terms: "Solo tarjetas de crédito.",
      appliesTo: "selected",
    });
  });

  it("says 'all' for promos that cover every product", () => {
    expect(toPublicPromo({ ...promo, scope: "all", startsAt: null, endsAt: null })).toMatchObject({
      appliesTo: "all",
      startsAt: null,
      endsAt: null,
    });
  });

  it("orders the banks by name", () => {
    const banks = [
      { id: "b2", name: "Continental", logoUrl: null },
      { id: "b1", name: "Itaú", logoUrl: null },
    ];
    expect(
      toPublicPromo({ ...promo, banks: [...banks].reverse() }).banks.map((bank) => bank.name),
    ).toEqual(["Continental", "Itaú"]);
  });
});

describe("formatPromoWindow", () => {
  it("words a range, a single day, an open start, an open end and no dates", () => {
    expect(formatPromoWindow("2026-11-01", "2026-11-30")).toBe("Del 01/11/2026 al 30/11/2026");
    expect(formatPromoWindow("2026-10-21", "2026-10-21")).toBe("El 21/10/2026");
    expect(formatPromoWindow("2026-11-01", null)).toBe("Desde el 01/11/2026");
    expect(formatPromoWindow(null, "2026-12-31")).toBe("Hasta el 31/12/2026");
    expect(formatPromoWindow(null, null)).toBe("Sin fecha de vencimiento");
  });
});
