import { describe, expect, it } from "vitest";
import { parseNewProductForm, parseProductForm } from "./schema";

const base = {
  name: "  Vestido Lila ",
  originalValueUsd: "100,50",
  "sizes.0.size": "M",
  "sizes.0.unitsBought": "2",
  "sizes.0.stock": "1",
};

describe("parseProductForm", () => {
  it("parses a valid product, trimming text and accepting a decimal comma", () => {
    const result = parseProductForm({ ...base, code: " V-1 ", category: "vestidos", color: "" });
    expect(result).toEqual({
      success: true,
      data: {
        code: "V-1",
        name: "Vestido Lila",
        brand: null,
        color: null,
        category: "vestidos",
        description: null,
        originalValueUsd: 100.5,
        sizes: [{ size: "M", unitsBought: 2, stock: 1 }],
      },
    });
  });

  it("reads sizes in index order", () => {
    const result = parseProductForm({
      ...base,
      "sizes.1.size": "S",
      "sizes.1.unitsBought": "3",
      "sizes.1.stock": "3",
    });
    expect(result.success && result.data.sizes.map((s) => s.size)).toEqual(["M", "S"]);
  });

  it("requires a name and a positive original value", () => {
    const result = parseProductForm({ ...base, name: " ", originalValueUsd: "0" });
    expect(result).toMatchObject({
      success: false,
      fieldErrors: { name: expect.any(String), originalValueUsd: expect.any(String) },
    });
  });

  it("rejects an unknown category", () => {
    expect(parseProductForm({ ...base, category: "zapatos" })).toMatchObject({
      success: false,
      fieldErrors: { category: expect.any(String) },
    });
  });

  it("rejects stock above the units bought", () => {
    expect(parseProductForm({ ...base, "sizes.0.stock": "3" })).toMatchObject({
      success: false,
      fieldErrors: { "sizes.0.stock": expect.any(String) },
    });
  });

  it("rejects non-integer or negative units and stock", () => {
    expect(parseProductForm({ ...base, "sizes.0.unitsBought": "1,5" })).toMatchObject({
      success: false,
      fieldErrors: { "sizes.0.unitsBought": expect.any(String) },
    });
    expect(parseProductForm({ ...base, "sizes.0.stock": "-1" })).toMatchObject({
      success: false,
      fieldErrors: { "sizes.0.stock": expect.any(String) },
    });
  });

  it("rejects an unknown size and a duplicated size", () => {
    expect(parseProductForm({ ...base, "sizes.0.size": "XXL" })).toMatchObject({
      success: false,
      fieldErrors: { "sizes.0.size": expect.any(String) },
    });
    expect(
      parseProductForm({
        ...base,
        "sizes.1.size": "M",
        "sizes.1.unitsBought": "1",
        "sizes.1.stock": "1",
      }),
    ).toMatchObject({ success: false, fieldErrors: { "sizes.1.size": expect.any(String) } });
  });

  it("requires at least one size", () => {
    expect(parseProductForm({ name: "A", originalValueUsd: "10" })).toMatchObject({
      success: false,
      fieldErrors: { sizes: expect.any(String) },
    });
  });
});

describe("parseNewProductForm", () => {
  it("also requires a lot id", () => {
    expect(parseNewProductForm(base)).toMatchObject({
      success: false,
      fieldErrors: { lotId: expect.any(String) },
    });
    const lotId = "00000000-0000-7000-8000-000000000000";
    expect(parseNewProductForm({ ...base, lotId })).toMatchObject({
      success: true,
      data: { lotId, name: "Vestido Lila" },
    });
  });
});
