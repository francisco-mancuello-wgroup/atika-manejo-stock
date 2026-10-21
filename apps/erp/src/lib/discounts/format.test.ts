import { describe, expect, it } from "vitest";
import { filterPickerProducts, formatScope, formatWindow } from "./format";

describe("formatWindow", () => {
  it("says there is no date limit", () => {
    expect(formatWindow(null, null)).toBe("Sin fechas");
  });
  it("formats open-ended and closed windows", () => {
    expect(formatWindow("2026-11-01", null)).toBe("Desde 01/11/2026");
    expect(formatWindow(null, "2026-12-31")).toBe("Hasta 31/12/2026");
    expect(formatWindow("2026-11-01", "2026-12-31")).toBe("01/11/2026 – 31/12/2026");
    expect(formatWindow("2026-11-01", "2026-11-01")).toBe("01/11/2026");
  });
});

describe("formatScope", () => {
  it("names the scope with the product count", () => {
    expect(formatScope("all", 0)).toBe("Todos");
    expect(formatScope("selected", 1)).toBe("1 producto");
    expect(formatScope("selected", 12)).toBe("12 productos");
  });
});

describe("filterPickerProducts", () => {
  const product = (id: string, name: string, lotId: string, category: string | null) => ({
    id,
    name,
    lotId,
    lotName: lotId,
    category,
    priceGs: 1000,
    imageUrl: null,
  });
  const products = [
    product("1", "Vestido Lino", "l1", "vestidos"),
    product("2", "Top Satén", "l1", "tops"),
    product("3", "Vestido Seda", "l2", "vestidos"),
    product("4", "Aros", "l2", null),
  ];

  it("returns everything without filters", () => {
    expect(filterPickerProducts(products, { query: "", lotId: "", category: "" })).toHaveLength(4);
  });
  it("searches names ignoring case and accents", () => {
    expect(
      filterPickerProducts(products, { query: "saten", lotId: "", category: "" }).map((p) => p.id),
    ).toEqual(["2"]);
    expect(
      filterPickerProducts(products, { query: "  VESTIDO ", lotId: "", category: "" }),
    ).toHaveLength(2);
  });
  it("combines lot and category filters", () => {
    expect(
      filterPickerProducts(products, { query: "", lotId: "l2", category: "" }).map((p) => p.id),
    ).toEqual(["3", "4"]);
    expect(
      filterPickerProducts(products, { query: "", lotId: "l2", category: "vestidos" }).map(
        (p) => p.id,
      ),
    ).toEqual(["3"]);
    expect(
      filterPickerProducts(products, { query: "", lotId: "", category: "sin-categoria" }).map(
        (p) => p.id,
      ),
    ).toEqual(["4"]);
  });
});
