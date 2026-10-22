import { describe, expect, it } from "vitest";
import { parseBankPromo } from "./schema";

const B1 = "0190f3a0-0000-7000-8000-000000000001";
const B2 = "0190f3a0-0000-7000-8000-000000000002";
const L1 = "0190f3a0-0000-7000-8000-0000000000a1";
const P1 = "0190f3a0-0000-7000-8000-0000000000b1";

const valid = { kind: "installments", value: "12", scope: "all", isActive: "on" };
const lists = (overrides: Partial<Parameters<typeof parseBankPromo>[1]> = {}) => ({
  bankIds: [B1],
  days: [],
  lotIds: [],
  productIds: [],
  ...overrides,
});

describe("parseBankPromo", () => {
  it("parses an installments promo for every product, every day, without dates", () => {
    expect(parseBankPromo(valid, lists())).toEqual({
      success: true,
      data: {
        kind: "installments",
        value: 12,
        capGs: null,
        startsAt: null,
        endsAt: null,
        terms: null,
        isActive: true,
        scope: "all",
        bankIds: [B1],
        days: [],
        lotIds: [],
        productIds: [],
      },
    });
  });

  it("treats an unchecked box as inactive and keeps trimmed terms", () => {
    const result = parseBankPromo(
      { ...valid, isActive: undefined as never, terms: "  Solo tarjetas de crédito.  " },
      lists(),
    );
    expect(result).toMatchObject({
      success: true,
      data: { isActive: false, terms: "Solo tarjetas de crédito." },
    });
  });

  it("turns blank terms into null and limits them to 2000 characters", () => {
    expect(parseBankPromo({ ...valid, terms: "   " }, lists())).toMatchObject({
      success: true,
      data: { terms: null },
    });
    expect(parseBankPromo({ ...valid, terms: "x".repeat(2001) }, lists())).toMatchObject({
      success: false,
      fieldErrors: { terms: expect.any(String) },
    });
  });

  it.each(["1", "49", "0", "-3", "6,5", "abc", ""])("rejects %j installments", (value) => {
    expect(parseBankPromo({ ...valid, value }, lists())).toMatchObject({
      success: false,
      fieldErrors: { value: expect.any(String) },
    });
  });

  it.each(["2", "48"])("accepts %j installments", (value) => {
    expect(parseBankPromo({ ...valid, value }, lists())).toMatchObject({ success: true });
  });

  it.each(["refund", "discount"])("accepts 1 to 100 percent for %s", (kind) => {
    for (const value of ["1", "100"]) {
      expect(parseBankPromo({ ...valid, kind, value }, lists())).toMatchObject({ success: true });
    }
    for (const value of ["0", "101", "12,5"]) {
      expect(parseBankPromo({ ...valid, kind, value }, lists())).toMatchObject({
        success: false,
        fieldErrors: { value: expect.any(String) },
      });
    }
  });

  it("requires a valid kind", () => {
    expect(parseBankPromo({ ...valid, kind: "cashback" }, lists())).toMatchObject({
      success: false,
      fieldErrors: { kind: "Elegí el tipo de promoción." },
    });
  });

  it("reads the cap in guaraníes, with or without thousands dots", () => {
    expect(parseBankPromo({ ...valid, capGs: "200.000" }, lists())).toMatchObject({
      success: true,
      data: { capGs: 200_000 },
    });
    expect(parseBankPromo({ ...valid, capGs: "150000" }, lists())).toMatchObject({
      success: true,
      data: { capGs: 150_000 },
    });
    expect(parseBankPromo({ ...valid, capGs: "  " }, lists())).toMatchObject({
      success: true,
      data: { capGs: null },
    });
  });

  it.each(["0", "-5", "abc", "99999999999"])("rejects the cap %j", (capGs) => {
    expect(parseBankPromo({ ...valid, capGs }, lists())).toMatchObject({
      success: false,
      fieldErrors: { capGs: expect.any(String) },
    });
  });

  it("validates the window and keeps the end on or after the start", () => {
    expect(
      parseBankPromo({ ...valid, startsAt: "2026-11-01", endsAt: "2026-11-30" }, lists()),
    ).toMatchObject({ success: true, data: { startsAt: "2026-11-01", endsAt: "2026-11-30" } });
    expect(parseBankPromo({ ...valid, startsAt: "2026-13-01" }, lists())).toMatchObject({
      success: false,
      fieldErrors: { startsAt: "Elegí una fecha válida." },
    });
    expect(
      parseBankPromo({ ...valid, startsAt: "2026-11-30", endsAt: "2026-11-01" }, lists()),
    ).toMatchObject({
      success: false,
      fieldErrors: { endsAt: "La fecha de fin no puede ser anterior a la de inicio." },
    });
  });

  it("requires at least one valid bank, without duplicates", () => {
    expect(parseBankPromo(valid, lists({ bankIds: [] }))).toEqual({
      success: false,
      fieldErrors: { bankIds: "Elegí al menos un banco." },
    });
    expect(parseBankPromo(valid, lists({ bankIds: ["nope"] }))).toMatchObject({ success: false });
    expect(parseBankPromo(valid, lists({ bankIds: [B1, B2, B1] }))).toMatchObject({
      success: true,
      data: { bankIds: [B1, B2] },
    });
  });

  it("sorts and deduplicates days, and ignores values outside 1-7", () => {
    expect(parseBankPromo(valid, lists({ days: ["4", "1", "4", "9", "x"] }))).toMatchObject({
      success: true,
      data: { days: [1, 4] },
    });
  });

  it("treats all seven days as every day", () => {
    expect(
      parseBankPromo(valid, lists({ days: ["1", "2", "3", "4", "5", "6", "7"] })),
    ).toMatchObject({ success: true, data: { days: [] } });
  });

  it("needs lots for the 'lots' scope and products for the 'products' scope", () => {
    expect(parseBankPromo({ ...valid, scope: "lots" }, lists())).toEqual({
      success: false,
      fieldErrors: { lotIds: "Elegí al menos un lote." },
    });
    expect(parseBankPromo({ ...valid, scope: "products" }, lists())).toEqual({
      success: false,
      fieldErrors: { productIds: "Elegí al menos un producto." },
    });
    expect(
      parseBankPromo({ ...valid, scope: "lots" }, lists({ lotIds: [L1, L1, "bad"] })),
    ).toMatchObject({ success: true, data: { scope: "lots", lotIds: [L1], productIds: [] } });
    expect(
      parseBankPromo({ ...valid, scope: "products" }, lists({ productIds: [P1] })),
    ).toMatchObject({ success: true, data: { scope: "products", productIds: [P1], lotIds: [] } });
  });

  it("drops the lists that do not belong to the chosen scope", () => {
    expect(parseBankPromo(valid, lists({ lotIds: [L1], productIds: [P1] }))).toMatchObject({
      success: true,
      data: { scope: "all", lotIds: [], productIds: [] },
    });
    expect(
      parseBankPromo({ ...valid, scope: "lots" }, lists({ lotIds: [L1], productIds: [P1] })),
    ).toMatchObject({ success: true, data: { lotIds: [L1], productIds: [] } });
  });

  it("requires a valid scope", () => {
    expect(parseBankPromo({ ...valid, scope: "selected" }, lists())).toMatchObject({
      success: false,
      fieldErrors: { scope: "Elegí a qué productos se aplica." },
    });
  });
});
