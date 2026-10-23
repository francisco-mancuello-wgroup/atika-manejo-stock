import { describe, expect, it } from "vitest";
import { formatPromoScope, promoStatus } from "./format";

describe("promoStatus", () => {
  const today = "2026-10-21";

  it("is Inactiva when switched off, whatever the window", () => {
    expect(promoStatus({ isActive: false, startsAt: null, endsAt: null }, today)).toBe("Inactiva");
    expect(promoStatus({ isActive: false, startsAt: "2027-01-01", endsAt: null }, today)).toBe(
      "Inactiva",
    );
  });

  it("is Vigente without dates and on the first and last day", () => {
    expect(promoStatus({ isActive: true, startsAt: null, endsAt: null }, today)).toBe("Vigente");
    expect(promoStatus({ isActive: true, startsAt: today, endsAt: null }, today)).toBe("Vigente");
    expect(promoStatus({ isActive: true, startsAt: null, endsAt: today }, today)).toBe("Vigente");
  });

  it("is Programada before the start and Vencida after the end", () => {
    expect(promoStatus({ isActive: true, startsAt: "2026-10-22", endsAt: null }, today)).toBe(
      "Programada",
    );
    expect(promoStatus({ isActive: true, startsAt: null, endsAt: "2026-10-20" }, today)).toBe(
      "Vencida",
    );
  });
});

describe("formatPromoScope", () => {
  it("summarizes each scope", () => {
    expect(formatPromoScope({ scope: "all", lotCount: 0, productCount: 0 })).toBe(
      "Todos los productos",
    );
    expect(formatPromoScope({ scope: "lots", lotCount: 3, productCount: 0 })).toBe("3 marcas");
    expect(formatPromoScope({ scope: "lots", lotCount: 1, productCount: 0 })).toBe("1 marca");
    expect(formatPromoScope({ scope: "products", lotCount: 0, productCount: 12 })).toBe(
      "12 productos",
    );
    expect(formatPromoScope({ scope: "products", lotCount: 0, productCount: 1 })).toBe(
      "1 producto",
    );
  });
});
